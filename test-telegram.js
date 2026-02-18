const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env
const envPath = path.join(__dirname, 'server/.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env file:', result.error);
    process.exit(1);
}

const token = process.env.TELEGRAM_BOT_TOKEN_1;
const chatId = process.env.TELEGRAM_CHAT_ID_GENERAL;

console.log('--- Telegram Bot Test ---');
console.log(`Loading .env from: ${envPath}`);
console.log(`Token: ${token ? token.substring(0, 10) + '...' : 'UNDEFINED'}`);
console.log(`Chat ID: ${chatId}`);

if (!token) {
    console.error('Error: TELEGRAM_BOT_TOKEN_1 is missing in .env');
    process.exit(1);
}

async function testBot() {
    try {
        // 1. Test getMe to verify token validity
        console.log('\nTesting token validity (getMe)...');
        const getMeResponse = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
        console.log('✅ Token is VALID.');
        console.log('Bot Info:', getMeResponse.data.result);

        // 2. Test sendMessage
        console.log(`\nTesting sendMessage to ${chatId}...`);
        const message = '🔔 This is a test message to verify the bot configuration.';
        const sendResponse = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: message
        });
        console.log('✅ Message sent SUCCESSFULLY.');
        console.log('Message ID:', sendResponse.data.result.message_id);

    } catch (error) {
        console.error('\n❌ Test FAILED');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testBot();
