import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PLANE_TOKEN = process.env.PLANE_API_TOKEN || 'plane_api_cd867c0209144f5098e1a9b4108b43a7';
const PLANE_URL = 'http://localhost:3000/api/v1/workspaces/trade-bot/projects/324fef07-4ae4-4c01-b077-44a37821195e/issues/';

const syncToPlane = async () => {
  const ticketsDir = 'docs/process/tickets';
  const files = fs.readdirSync(ticketsDir).filter(f => f.startsWith('AGSYS-35') && f.endsWith('.md') && !f.includes('requirements') && !f.includes('assumptions'));

  console.log(`Found ${files.length} tickets to sync...`);

  for (const file of files) {
    const content = fs.readFileSync(path.join(ticketsDir, file), 'utf-8');
    const lines = content.split('\n');
    const name = lines[0].replace('# ', '').trim();
    const description = content; // Send full markdown as description

    try {
      const response = await axios.post(PLANE_URL, {
        name,
        description_html: `<pre>${description}</pre>`, // Simplest way to send MD for now
        priority: 'medium',
      }, {
        headers: {
          'X-API-Key': PLANE_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Synced ${file} -> Issue ID: ${response.data.id}`);
    } catch (error: any) {
      console.error(`Failed to sync ${file}:`, error.response?.data || error.message);
    }
  }
};

syncToPlane();
