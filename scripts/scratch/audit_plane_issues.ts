import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const PLANE_TOKEN = process.env.PLANE_API_TOKEN || 'plane_api_cd867c0209144f5098e1a9b4108b43a7';
const WORKSPACE = 'trade-bot';
const PROJECT = '324fef07-4ae4-4c01-b077-44a37821195e';
const BASE_URL = `http://localhost:3000/api/v1/workspaces/${WORKSPACE}/projects/${PROJECT}/issues/`;

const auditIssues = async () => {
    try {
        console.log('Fetching all issues from Plane...');
        const response = await axios.get(BASE_URL, {
            headers: { 'X-API-Key': PLANE_TOKEN }
        });
        
        const issues = response.data.results as any[];
        console.log(`Found ${issues.length} issues total.`);

        const localTicketsDir = 'docs/process/tickets';
        const localFiles = fs.readdirSync(localTicketsDir).filter(f => f.startsWith('AGSYS-35') && f.endsWith('.md'));

        console.log('\n--- Duplicate Analysis ---');
        
        for (const file of localFiles) {
            const content = fs.readFileSync(path.join(localTicketsDir, file), 'utf-8');
            const localName = content.split('\n')[0].replace('# ', '').trim();
            
            // Look for issues that contain the local name or part of it
            const matched = issues.filter(i => {
                const nameInPlane = i.name.toLowerCase();
                const nameInTicket = localName.toLowerCase();
                return nameInPlane === nameInTicket || 
                       nameInPlane.includes(nameInTicket) || 
                       nameInTicket.includes(nameInPlane);
            });

            if (matched.length > 1) {
                console.log(`[DUPLICATE FOUND] ${file}`);
                matched.forEach(i => {
                    console.log(`  - ID: ${i.id} | Name: ${i.name} | State: ${i.state} | Created: ${i.created_at}`);
                });
            } else if (matched.length === 1) {
                console.log(`[MATCHED] ${file} -> Plane ID: ${matched[0].id}`);
            } else {
                console.log(`[NO MATCH] ${file}`);
            }
        }
    } catch (error: any) {
        console.error('Audit failed:', error.response?.data || error.message);
    }
};

auditIssues();
