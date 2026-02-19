const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const telegramTokens = [
    process.env.TELEGRAM_BOT_TOKEN_1
].filter(token => token); // Filter out undefined tokens

const chatIds = {
    general: process.env.TELEGRAM_CHAT_ID_GENERAL || '-redacted_chat_id' // Default from user snippet
};

const TelegramService = {
    /**
     * Escape characters for HTML
     */
    escapeHTML(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    /**
     * Escape characters for Telegram MarkdownV2
     */
    escapeMarkdown(text) {
        if (!text) return '';
        return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
    },

    /**
     * Send a message to specific chat IDs
     * @param {string|Array} targetChatIds - Single ID or array of IDs
     * @param {string} message - The message text
     * @param {boolean} isMarkdown - Whether to use MarkdownV2
     */
    async sendMessage(targetChatIds, message, isMarkdown = false) {
        if (!Array.isArray(targetChatIds)) {
            targetChatIds = [targetChatIds];
        }

        const stats = { success: 0, failed: 0 };

        for (const chatId of targetChatIds) {
            // We iterate over all available bot tokens to ensure delivery? 
            // Or just use the first one? The original code used different bots for different chats.
            // For simplicity and robustness, we'll try to send with the first available token for now.
            // If the user wants specific bots for specific chats, we might need more config.
            // Based on snippet: 
            // Bot 1 -> Chat -redacted_chat_id
            // Bot 2 -> Chat -1001558369109

            // Let's try to infer which token to use or just uses TOKEN_1 as primary.
            // For now, I will use TOKEN_1 for everything unless specified. 
            // Actually, the user snippet sent to BOTH bots for the "telegramChange" function? 
            // No, `telegramMessage` sent to options1 (Bot1 -> Chat1) AND options2 (Bot2 -> Chat2).

            // We will attempt to send to the specified chat ID using the first token.
            // If that fails, maybe try the second? 
            // Let's keep it simple: Use TOKEN_1 by default.

            const token = process.env.TELEGRAM_BOT_TOKEN_1;
            if (!token) {
                console.error('TELEGRAM_BOT_TOKEN_1 is not defined');
                continue;
            }

            try {
                await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                    chat_id: chatId,
                    text: message,
                    parse_mode: isMarkdown ? "MarkdownV2" : "HTML",
                    disable_web_page_preview: true
                });
                stats.success++;
                // console.log(`Message sent to ${chatId}`);
            } catch (error) {
                console.error(`Failed to send Telegram message to ${chatId}:`, error.message);
                stats.failed++;
            }
        }
        return stats;
    },

    /**
     * Broadcast a message to all configured channels
     */
    async broadcast(message) {
        const targets = Object.values(chatIds);
        // We need to handle multi-bot scenario if the chats are exclusive to bots.
        // Let's iterate tokens and try to send to their respective "default" chats if mapped, 
        // OR just try sending to the target chat with the available token.

        // Strategy: 
        // 1. Send to General Chat using Bot 1

        const p1 = this.sendToBot(process.env.TELEGRAM_BOT_TOKEN_1, chatIds.general, message);

        await Promise.all([p1]);
    },

    async sendToBot(token, chatId, message) {
        if (!token || !chatId) return;
        // console.log(`[Telegram] Sending to ${chatId}: ${message}`); 
        try {
            await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                chat_id: chatId,
                text: message,
                parse_mode: "HTML",
                disable_web_page_preview: true
            });
        } catch (error) {
            console.error(`Failed to send to ${chatId} via bot ending in ...${token.slice(-5)}:`, error.message);
            if (error.response && error.response.data) {
                console.error('Telegram API Error Data:', JSON.stringify(error.response.data));
            }
        }
    },

    /**
     * Send a message specifically to the Azelert group
     */
    async sendAzelert(message) {
        const token = process.env.TELEGRAM_BOT_TOKEN_AZELERT;
        const chatId = process.env.TELEGRAM_CHAT_ID_AZELERT;
        if (!token || !chatId) {
            console.error('Azelert configuration missing');
            return;
        }
        await this.sendToBot(token, chatId, message);
    }
};

module.exports = TelegramService;
