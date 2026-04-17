import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PLANE_TOKEN = process.env.PLANE_API_TOKEN || 'plane_api_cd867c0209144f5098e1a9b4108b43a7';
const BASE_URL = 'http://localhost:3000/api/v1/workspaces/trade-bot/projects/324fef07-4ae4-4c01-b077-44a37821195e/issues/';

const STATE_MAPPING: Record<string, string> = {
  'backlog': '2f4d91f5-6595-4bcd-b70e-a28080ee1307',
  'todo': '304a53cc-54d7-4a63-a85a-04995c58aa4c',
  'intake': '304a53cc-54d7-4a63-a85a-04995c58aa4c',
  'research': '8209551c-2a4b-4d61-851c-cdd674088ce1',
  'design': '8209551c-2a4b-4d61-851c-cdd674088ce1',
  'execution': '8209551c-2a4b-4d61-851c-cdd674088ce1',
  'verification': '8209551c-2a4b-4d61-851c-cdd674088ce1',
  'done': 'fb18e838-70e6-4db5-933c-2d26bb61b567',
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function requestWithRetry(fn: () => Promise<any>, retries = 5, delay = 1000): Promise<any> {
    try {
        return await fn();
    } catch (error: any) {
        if (error.response?.status === 429 || error.response?.data?.error_code === 5900) {
            if (retries > 0) {
                console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
                await sleep(delay);
                return requestWithRetry(fn, retries - 1, delay * 2);
            }
        }
        throw error;
    }
}

const syncToPlane = async () => {
  const ticketsDir = 'docs/process/tickets';
  const files = fs.readdirSync(ticketsDir).filter(f => f.startsWith('AGSYS-35') && f.endsWith('.md') && !f.includes('requirements') && !f.includes('assumptions'));

  console.log(`Found ${files.length} tickets to sync...`);

  let existingIssues: any[] = [];
  try {
    const res = await requestWithRetry(() => axios.get(BASE_URL, { headers: { 'X-API-Key': PLANE_TOKEN } }));
    existingIssues = res.data.results || [];
    console.log(`Fetched ${existingIssues.length} existing issues.`);
  } catch (error: any) {
    console.warn('Failed to fetch existing issues:', error.response?.data || error.message);
  }

  const issueMap = new Map(existingIssues.map(i => [i.name, i.id]));

  for (const file of files) {
        // Parse local ticket
        const content = fs.readFileSync(path.join(ticketsDir, file), 'utf-8');
        const lines = content.split('\n');
        const name = lines[0].replace('# ', '').trim();
        const stageMatch = content.match(/- Stage: (.*)/);
        const stage = stageMatch ? stageMatch[1].trim() : 'backlog';

        // Extract AGSYS tag (e.g. AGSYS-3501)
        const tagMatch = file.match(/AGSYS-\d+/);
        const tag = tagMatch ? tagMatch[0] : null;

        // Map stage to Plane state ID
        const stateId = STATE_MAPPING[stage as keyof typeof STATE_MAPPING] || STATE_MAPPING['backlog'];

        // Find existing issue by tag OR name
        const existing = existingIssues.find(i => {
            if (tag) {
                return i.name.includes(tag);
            }
            return i.name.toLowerCase() === name.toLowerCase();
        });

        // Construct payload
        const payload = {
            name,
            description_html: `<pre>${content}</pre>`,
            priority: 'medium',
            state: stateId
        };

    const existingId = existing ? existing.id : issueMap.get(name);

    try {
      if (existingId) {
        await requestWithRetry(() => axios.patch(`${BASE_URL}${existingId}/`, payload, {
          headers: { 'X-API-Key': PLANE_TOKEN, 'Content-Type': 'application/json' }
        }));
        console.log(`[UPDATED] ${file} (${stage})`);
      } else {
        const response = await requestWithRetry(() => axios.post(BASE_URL, payload, {
          headers: { 'X-API-Key': PLANE_TOKEN, 'Content-Type': 'application/json' }
        }));
        console.log(`[CREATED] ${file} (${stage}) -> ${response.data.id}`);
      }
      // Add a base delay after each successful operation
      await sleep(500);
    } catch (error: any) {
      console.error(`Failed to sync ${file}:`, error.response?.data || error.message);
    }
  }
};

syncToPlane();
