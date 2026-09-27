const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TelegramService = require('./TelegramService');
const MuteService = require('./MuteService');

class TelegramBotService {
    constructor() {
        this.token = process.env.TELEGRAM_BOT_TOKEN_1 || null;
        this.offset = 0;
        this.isPolling = false;
        this.pollTimeout = null;
        this.version = '2.4.6';
    }

    /**
     * Start polling for Telegram bot updates
     */
    start() {
        if (!this.token) {
            console.log('[TelegramBotService] ⚠️ No TELEGRAM_BOT_TOKEN_1 provided. Bot listener inactive.');
            return;
        }

        if (this.isPolling) return;
        this.isPolling = true;
        console.log('[TelegramBotService] 🚀 Telegram Bot Control Center polling started.');

        // Initialize MuteService if not already initialized
        MuteService.init();

        this.poll();
    }

    /**
     * Stop polling
     */
    stop() {
        this.isPolling = false;
        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = null;
        }
    }

    /**
     * Long-polling loop using Telegram getUpdates API
     */
    async poll() {
        if (!this.isPolling) return;

        try {
            const url = `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.offset}&timeout=25`;
            const response = await axios.get(url, { timeout: 35000 });

            if (response.data && response.data.ok && Array.isArray(response.data.result)) {
                for (const update of response.data.result) {
                    this.offset = update.update_id + 1;
                    await this.handleUpdate(update);
                }
            }
        } catch (error) {
            // Network errors or timeout: backoff slightly before retrying
            if (!error.message.includes('timeout')) {
                console.error('[TelegramBotService] Polling error:', error.message);
            }
            await new Promise(r => setTimeout(r, 3000));
        }

        if (this.isPolling) {
            this.pollTimeout = setTimeout(() => this.poll(), 500);
        }
    }

    /**
     * Route incoming updates (messages and callback queries)
     */
    async handleUpdate(update) {
        try {
            if (update.message) {
                await this.handleMessage(update.message);
            } else if (update.callback_query) {
                await this.handleCallbackQuery(update.callback_query);
            }
        } catch (err) {
            console.error('[TelegramBotService] Error handling update:', err.message);
        }
    }

    /**
     * Handle incoming text messages & commands
     */
    async handleMessage(msg) {
        if (!msg.text) return;
        const chatId = msg.chat.id;
        const text = msg.text.trim();
        const parts = text.split(/\s+/);
        let cmd = parts[0].toLowerCase();

        // Strip bot username suffix in groups (e.g. /help@MyBot -> /help)
        if (cmd.includes('@')) {
            cmd = cmd.split('@')[0];
        }

        switch (cmd) {
            case '/start':
            case '/help':
            case '/menu':
                await this.sendMainMenu(chatId);
                break;

            case '/mute':
            case '/sustur':
                if (parts[1]) {
                    // Direct command: /mute <coin> [duration]
                    const coin = parts[1].toLowerCase();
                    const duration = parts[2] || '1d';
                    await this.executeMute(chatId, coin, duration);
                } else {
                    // Open Mute Submenu
                    await this.sendMuteMenu(chatId);
                }
                break;

            case '/unmute':
            case '/ac':
                if (parts[1]) {
                    const coin = parts[1].toLowerCase();
                    await this.executeUnmute(chatId, coin);
                } else {
                    await this.sendMutedList(chatId);
                }
                break;

            case '/muted':
            case '/susturulanlar':
                await this.sendMutedList(chatId);
                break;

            case '/status':
            case '/durum':
                await this.sendStatusMenu(chatId);
                break;

            case '/settings':
            case '/ayarlar':
                await this.sendSettingsMenu(chatId);
                break;
        }
    }

    /**
     * Handle button taps (callback queries)
     */
    async handleCallbackQuery(query) {
        const queryId = query.id;
        const data = query.data || '';
        const chatId = query.message?.chat?.id;
        const messageId = query.message?.message_id;

        // Acknowledge immediately to dismiss loading spinner
        await TelegramService.answerCallbackQuery(this.token, queryId);

        if (!chatId || !messageId) return;

        if (data === 'menu:main') {
            await this.editToMainMenu(chatId, messageId);
        } else if (data === 'menu:mute') {
            await this.editToMuteMenu(chatId, messageId);
        } else if (data === 'menu:muted') {
            await this.editToMutedList(chatId, messageId);
        } else if (data === 'menu:status') {
            await this.editToStatusMenu(chatId, messageId);
        } else if (data === 'menu:settings') {
            await this.editToSettingsMenu(chatId, messageId);
        } else if (data === 'menu:cancel') {
            await TelegramService.editMessage(this.token, chatId, messageId, '❌ <i>Menü kapatıldı.</i>');
        } else if (data.startsWith('mute_select:')) {
            const coin = data.replace('mute_select:', '');
            await this.editToDurationPicker(chatId, messageId, coin);
        } else if (data.startsWith('mute_dur:')) {
            // mute_dur:<coin>:<duration>
            const [, coin, duration] = data.split(':');
            await this.executeMuteInMessage(chatId, messageId, coin, duration);
        } else if (data.startsWith('unmute:')) {
            const coin = data.replace('unmute:', '');
            await this.executeUnmuteInMessage(chatId, messageId, coin);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MENU RENDERING METHODS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * 1. MASTER MAIN MENU (/help, /start, /menu)
     */
    getMainMenuContent() {
        const text = `⚡ <b>VueCoin Kontrol Merkezi</b>\n\n` +
            `Aşağıdaki menüden dilediğin işlemi seçebilirsin:\n\n` +
            `• <b>Coin Susturma:</b> Belirli coinlerin bildirimlerini geçici olarak kapat\n` +
            `• <b>Susturulanlar:</b> Aktif susturulan coinleri ve kalan süreleri gör\n` +
            `• <b>Bot Durumu:</b> Sunucu & piyasa tarama durumu\n` +
            `• <b>Ayarlar Özeti:</b> Güncel arbitraj kural ve eşikleri`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '🔇 Coin Sustur', callback_data: 'menu:mute' },
                    { text: '📋 Susturulanlar', callback_data: 'menu:muted' }
                ],
                [
                    { text: '📊 Bot Durumu', callback_data: 'menu:status' },
                    { text: '⚙️ Ayarlar Özeti', callback_data: 'menu:settings' }
                ],
                [
                    { text: '❌ Menüyü Kapat', callback_data: 'menu:cancel' }
                ]
            ]
        };

        return { text, replyMarkup };
    }

    async sendMainMenu(chatId) {
        const { text, replyMarkup } = this.getMainMenuContent();
        await TelegramService.sendToBot(this.token, chatId, text, replyMarkup);
    }

    async editToMainMenu(chatId, messageId) {
        const { text, replyMarkup } = this.getMainMenuContent();
        await TelegramService.editMessage(this.token, chatId, messageId, text, replyMarkup);
    }

    /**
     * 2. MUTE SUB-MENU (Suggests last 5 alerted coins)
     */
    getMuteMenuContent() {
        const recentAlerts = MuteService.getRecentAlerts();

        let text = `🔇 <b>Coin Susturma Menüsü</b>\n\n` +
            `Bildirim almayı durdurmak istediğin coini seç:\n`;

        const keyboard = [];

        if (recentAlerts.length > 0) {
            text += `\n<i>Son bildirim gelen coinler:</i>\n`;
            // Group coins into rows of 2 or 3
            const row1 = recentAlerts.slice(0, 3).map(coin => ({
                text: `🔇 ${coin}`,
                callback_data: `mute_select:${coin.toLowerCase()}`
            }));
            keyboard.push(row1);

            if (recentAlerts.length > 3) {
                const row2 = recentAlerts.slice(3, 5).map(coin => ({
                    text: `🔇 ${coin}`,
                    callback_data: `mute_select:${coin.toLowerCase()}`
                }));
                keyboard.push(row2);
            }
        } else {
            text += `\n<i>Henüz yeni bildirim geçmişi bulunmuyor.</i>\n`;
        }

        text += `\n💡 <i>Farklı bir coin için sohbete direkt yazabilirsin:\n<code>/mute btc 1d</code> veya <code>/mute sol 3d</code></i>`;

        keyboard.push([
            { text: '📋 Susturulanlar Listesi', callback_data: 'menu:muted' }
        ]);
        keyboard.push([
            { text: '⬅️ Ana Menü', callback_data: 'menu:main' }
        ]);

        return { text, replyMarkup: { inline_keyboard: keyboard } };
    }

    async sendMuteMenu(chatId) {
        const { text, replyMarkup } = this.getMuteMenuContent();
        await TelegramService.sendToBot(this.token, chatId, text, replyMarkup);
    }

    async editToMuteMenu(chatId, messageId) {
        const { text, replyMarkup } = this.getMuteMenuContent();
        await TelegramService.editMessage(this.token, chatId, messageId, text, replyMarkup);
    }

    /**
     * 3. DURATION PICKER SUB-MENU
     */
    async editToDurationPicker(chatId, messageId, coin) {
        const upper = coin.toUpperCase();
        const text = `⏱️ <b>${upper}</b> coinini ne kadar süre susturmak istiyorsun?\n\n` +
            `Seçtiğin süre boyunca <b>${upper}</b> için hiçbir arbitraj bildirimi gönderilmeyecek.`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '1 Gün (24 saat)', callback_data: `mute_dur:${coin}:1d` },
                    { text: '3 Gün', callback_data: `mute_dur:${coin}:3d` }
                ],
                [
                    { text: '7 Gün (1 hafta)', callback_data: `mute_dur:${coin}:7d` }
                ],
                [
                    { text: '⬅️ Geri', callback_data: 'menu:mute' },
                    { text: '❌ İptal', callback_data: 'menu:cancel' }
                ]
            ]
        };

        await TelegramService.editMessage(this.token, chatId, messageId, text, replyMarkup);
    }

    /**
     * 4. MUTED COINS LIST SUB-MENU
     */
    getMutedListContent() {
        const muted = MuteService.getMutedCoins();

        let text = `📋 <b>Susturulan Coinler:</b>\n\n`;
        const keyboard = [];

        if (muted.length === 0) {
            text += `<i>Şu anda susturulmuş hiçbir coin bulunmuyor. Tüm fırsatlar için bildirimler aktif!</i>`;
        } else {
            muted.forEach(item => {
                text += `• <b>${item.symbol}</b> — Kalan süre: <code>${item.remainingText}</code> (Bitiş: ${item.untilFormatted})\n`;
                keyboard.push([
                    { text: `🔊 ${item.symbol} Sesini Aç`, callback_data: `unmute:${item.coin}` }
                ]);
            });
        }

        keyboard.push([
            { text: '🔇 Yeni Coin Sustur', callback_data: 'menu:mute' },
            { text: '⬅️ Ana Menü', callback_data: 'menu:main' }
        ]);

        return { text, replyMarkup: { inline_keyboard: keyboard } };
    }

    async sendMutedList(chatId) {
        const { text, replyMarkup } = this.getMutedListContent();
        await TelegramService.sendToBot(this.token, chatId, text, replyMarkup);
    }

    async editToMutedList(chatId, messageId) {
        const { text, replyMarkup } = this.getMutedListContent();
        await TelegramService.editMessage(this.token, chatId, messageId, text, replyMarkup);
    }

    /**
     * 5. BOT STATUS SUB-MENU
     */
    async getStatusContent() {
        const CoinDataService = require('./CoinDataService');
        const coinCount = Object.keys(CoinDataService.coinList || {}).length;
        const uptimeHours = (process.uptime() / 3600).toFixed(1);

        const text = `📊 <b>VueCoin Platform Durumu</b>\n\n` +
            `🟢 <b>Sistem:</b> Aktif (7/24 Arka Plan İşçisi)\n` +
            `⏱️ <b>Çalışma Süresi:</b> ${uptimeHours} saat\n` +
            `🪙 <b>Taranan Coin Sayısı:</b> ${coinCount} adet\n` +
            `🚀 <b>Sürüm:</b> v${this.version}\n` +
            `📡 <b>Borsalar:</b> Binance (WebSocket) • Paribu • BtcTurk\n` +
            `🔇 <b>Aktif Susturulan Coin:</b> ${MuteService.getMutedCoins().length} adet`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '🔄 Durumu Yenile', callback_data: 'menu:status' },
                    { text: '⬅️ Ana Menü', callback_data: 'menu:main' }
                ]
            ]
        };

        return { text, replyMarkup };
    }

    async sendStatusMenu(chatId) {
        const { text, replyMarkup } = await this.getStatusContent();
        await TelegramService.sendToBot(this.token, chatId, text, replyMarkup);
    }

    async editToStatusMenu(chatId, messageId) {
        const { text, replyMarkup } = await this.getStatusContent();
        await TelegramService.editMessage(this.token, chatId, messageId, text, replyMarkup);
    }

    /**
     * 6. SETTINGS SUMMARY SUB-MENU
     */
    async getSettingsContent() {
        const CoinDataService = require('./CoinDataService');
        const s = CoinDataService.settings || {};

        const text = `⚙️ <b>Aktif Arbitraj Ayarları</b>\n\n` +
            `<b>Çapraz Arbitraj:</b> ${s.crossEnabled !== false ? '✅ Açık' : '❌ Kapalı'}\n` +
            `• Min Kâr: ₺${(s.crossMinProfit || 1000).toLocaleString('tr-TR')}\n` +
            `• Min ROI: %${s.crossMinROI || 0.5}\n` +
            `• Cooldown: ${s.crossCooldown || 5} dakika\n\n` +
            `<b>Borsa İçi (Intra):</b> ${s.intraEnabled !== false ? '✅ Açık' : '❌ Kapalı'}\n` +
            `• Min Kâr: ₺${(s.intraMinProfit || 100).toLocaleString('tr-TR')}\n` +
            `• Min ROI: %${s.intraMinROI || 0}\n` +
            `• Cooldown: ${s.intraCooldown || 5} dakika\n\n` +
            `<b>Paribu İçi:</b> ${s.paribuEnabled !== false ? '✅ Açık' : '❌ Kapalı'}\n` +
            `• Min Kâr: ₺${(s.paribuMinProfit || 50).toLocaleString('tr-TR')}\n\n` +
            `<i>Ayarları değiştirmek için web arayüzündeki Settings sayfasını kullanabilirsiniz.</i>`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '⬅️ Ana Menü', callback_data: 'menu:main' }
                ]
            ]
        };

        return { text, replyMarkup };
    }

    async sendSettingsMenu(chatId) {
        const { text, replyMarkup } = await this.getSettingsContent();
        await TelegramService.sendToBot(this.token, chatId, text, replyMarkup);
    }

    async editToSettingsMenu(chatId, messageId) {
        const { text, replyMarkup } = await this.getSettingsContent();
        await TelegramService.editMessage(this.token, chatId, messageId, text, replyMarkup);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ACTION HANDLERS
    // ─────────────────────────────────────────────────────────────────────────────

    async executeMuteInMessage(chatId, messageId, coin, durationStr) {
        const muteInfo = MuteService.muteCoin(coin, durationStr);
        const upper = coin.toUpperCase();
        const durationText = durationStr === '1d' ? '1 gün' : (durationStr === '3d' ? '3 gün' : (durationStr === '7d' ? '7 gün' : durationStr));
        const formattedDate = MuteService.formatDate(muteInfo.until);

        const text = `✅ <b>${upper}</b> coini <b>${durationText}</b> boyunca susturuldu.\n\n` +
            `📅 <b>Bitiş Zamanı:</b> ${formattedDate}\n\n` +
            `<i>Bu süre boyunca ${upper} fırsatları için Telegram bildirimi gönderilmeyecek.</i>`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: `🔊 ${upper} Susturmasını Kaldır`, callback_data: `unmute:${coin}` }
                ],
                [
                    { text: '📋 Susturulanlar', callback_data: 'menu:muted' },
                    { text: '⬅️ Ana Menü', callback_data: 'menu:main' }
                ]
            ]
        };

        await TelegramService.editMessage(this.token, chatId, messageId, text, replyMarkup);
    }

    async executeMute(chatId, coin, durationStr) {
        const muteInfo = MuteService.muteCoin(coin, durationStr);
        const upper = coin.toUpperCase();
        const durationText = durationStr === '1d' ? '1 gün' : (durationStr === '3d' ? '3 gün' : (durationStr === '7d' ? '7 gün' : durationStr));
        const formattedDate = MuteService.formatDate(muteInfo.until);

        const text = `✅ <b>${upper}</b> coini <b>${durationText}</b> boyunca susturuldu.\n\n` +
            `📅 <b>Bitiş Zamanı:</b> ${formattedDate}\n\n` +
            `<i>Bu süre boyunca ${upper} fırsatları için Telegram bildirimi gönderilmeyecek.</i>`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: `🔊 ${upper} Susturmasını Kaldır`, callback_data: `unmute:${coin}` },
                    { text: '📋 Susturulanlar', callback_data: 'menu:muted' }
                ],
                [
                    { text: '⬅️ Ana Menü', callback_data: 'menu:main' }
                ]
            ]
        };

        await TelegramService.sendToBot(this.token, chatId, text, replyMarkup);
    }

    async executeUnmuteInMessage(chatId, messageId, coin) {
        MuteService.unmuteCoin(coin);
        const upper = coin.toUpperCase();

        const text = `🔊 <b>${upper}</b> susturması kaldırıldı!\n\n` +
            `<i>Artık ${upper} ile ilgili tüm arbitraj bildirimleri normal şekilde iletilecek.</i>`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '🔇 Başka Coin Sustur', callback_data: 'menu:mute' },
                    { text: '📋 Susturulanlar', callback_data: 'menu:muted' }
                ],
                [
                    { text: '⬅️ Ana Menü', callback_data: 'menu:main' }
                ]
            ]
        };

        await TelegramService.editMessage(this.token, chatId, messageId, text, replyMarkup);
    }

    async executeUnmute(chatId, coin) {
        MuteService.unmuteCoin(coin);
        const upper = coin.toUpperCase();

        const text = `🔊 <b>${upper}</b> susturması kaldırıldı!\n\n` +
            `<i>Artık ${upper} ile ilgili tüm arbitraj bildirimleri normal şekilde iletilecek.</i>`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '📋 Susturulanlar', callback_data: 'menu:muted' },
                    { text: '⬅️ Ana Menü', callback_data: 'menu:main' }
                ]
            ]
        };

        await TelegramService.sendToBot(this.token, chatId, text, replyMarkup);
    }
}

module.exports = new TelegramBotService();
