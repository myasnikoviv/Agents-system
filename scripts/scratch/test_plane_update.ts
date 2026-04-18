import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PLANE_TOKEN = process.env.PLANE_API_TOKEN || 'plane_api_cd867c0209144f5098e1a9b4108b43a7';
const BASE_URL = 'http://localhost:3000/api/v1/workspaces/trade-bot/projects/324fef07-4ae4-4c01-b077-44a37821195e/issues/';

const testUpdate = async () => {
  try {
    // Let's find AGSYS-3501 first
    const res = await axios.get(BASE_URL, { headers: { 'X-API-Key': PLANE_TOKEN } });
    const issue = res.data.results.find((i: any) => i.name.includes('AGSYS-3501'));
    
    if (!issue) {
        console.error('Issue AGSYS-3501 not found');
        return;
    }

    console.log(`Found issue ${issue.name} with ID ${issue.id}. Current state: ${issue.state}`);

    const DONE_STATE = 'fb18e838-70e6-4db5-933c-2d26bb61b567';
    
    // Attempt update
    const updateRes = await axios.patch(`${BASE_URL}${issue.id}/`, {
        state: DONE_STATE
    }, {
        headers: { 'X-API-Key': PLANE_TOKEN, 'Content-Type': 'application/json' }
    });

    console.log('Update result status:', updateRes.status);
    console.log('Updated state in response:', updateRes.data.state);
  } catch (error: any) {
    console.error('Update failed:', error.response?.data || error.message);
  }
};

testUpdate();
