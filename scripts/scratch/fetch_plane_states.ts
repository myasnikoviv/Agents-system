import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PLANE_TOKEN = process.env.PLANE_API_TOKEN || 'plane_api_cd867c0209144f5098e1a9b4108b43a7';
const STATES_URL = 'http://localhost:3000/api/v1/workspaces/trade-bot/projects/324fef07-4ae4-4c01-b077-44a37821195e/states/';

const fetchStates = async () => {
  try {
    const response = await axios.get(STATES_URL, {
      headers: {
        'X-API-Key': PLANE_TOKEN,
      }
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('Failed to fetch states:', error.response?.data || error.message);
  }
};

fetchStates();
