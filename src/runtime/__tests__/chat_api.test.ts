import axios from 'axios';

async function testChatApi() {
    console.log('--- Testing /api/chat Endpoint ---');
    try {
        const response = await axios.post('http://localhost:3001/api/chat', {
            message: 'Analyze current market volume for HYPEUSDT',
            executionMode: 'linear'
        });
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error('Error hitting /api/chat:', error.response?.data || error.message);
    }
}

testChatApi();
