const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testApi() {
    console.log('--- Testing API Routes ---');

    // 1. Test /api/test/
    try {
        const res = await axios.get(`${BASE_URL}/api/test/`);
        if (res.status === 200 && res.data === 'test') {
            console.log('✅ GET /api/test/ - PASSED');
        } else {
            console.error('❌ GET /api/test/ - FAILED', res.status, res.data);
        }
    } catch (e) {
        console.error('❌ GET /api/test/ - ERROR', e.message);
    }

    // 2. Test /api/telegram (POST)
    try {
        const res = await axios.post(`${BASE_URL}/api/telegram`, {
            message: '🔃 API Test Message'
        });
        if (res.status === 200) {
            console.log('✅ POST /api/telegram - PASSED');
        } else {
            console.error('❌ POST /api/telegram - FAILED', res.status, res.data);
        }
    } catch (e) {
        console.error('❌ POST /api/telegram - ERROR', e.message);
    }
}

testApi();
