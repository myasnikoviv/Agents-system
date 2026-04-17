"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function testChatApi() {
    console.log('--- Testing /api/chat Endpoint ---');
    try {
        const response = await axios_1.default.post('http://localhost:3001/api/chat', {
            message: 'Analyze current market volume for HYPEUSDT',
            executionMode: 'linear'
        });
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));
    }
    catch (error) {
        console.error('Error hitting /api/chat:', error.response?.data || error.message);
    }
}
testChatApi();
