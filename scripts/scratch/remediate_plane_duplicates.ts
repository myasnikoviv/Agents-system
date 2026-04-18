import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PLANE_TOKEN = process.env.PLANE_API_TOKEN || 'plane_api_cd867c0209144f5098e1a9b4108b43a7';
const WORKSPACE = 'trade-bot';
const PROJECT = '324fef07-4ae4-4c01-b077-44a37821195e';
const BASE_URL = `http://localhost:3000/api/v1/workspaces/${WORKSPACE}/projects/${PROJECT}/issues/`;

const MODE: 'DRY_RUN' | 'PURGE' = (process.argv[2] as any) || 'DRY_RUN';

const remediate = async () => {
    try {
        console.log(`Starting Plane Remediation [MODE=${MODE}]...`);
        
        // Fetch ALL issues (assuming < 1000 for now, but in production we'd paginate)
        const response = await axios.get(BASE_URL, {
            headers: { 'X-API-Key': PLANE_TOKEN }
        });
        
        const issues = response.data.results as any[];
        console.log(`Fetched ${issues.length} issues.`);

        // Group by AGSYS tag
        const groups: Record<string, any[]> = {};
        
        for (const issue of issues) {
            const match = issue.name.match(/AGSYS-\d+/);
            if (match) {
                const tag = match[0];
                if (!groups[tag]) groups[tag] = [];
                groups[tag].push(issue);
            }
        }

        const toDelete: string[] = [];
        const toKeep: Record<string, string> = {};

        console.log('\n--- Analysis Results ---');
        for (const tag in groups) {
            // ONLY REMEDIATE AGSYS-35xx series to be safe
            if (!tag.startsWith('AGSYS-35')) continue;

            const sortedByAge = groups[tag].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            const oldest = sortedByAge[0];
            const others = sortedByAge.slice(1);

            toKeep[tag] = oldest.id;
            
            if (others.length > 0) {
                console.log(`[${tag}] Found ${others.length} duplicates. Keeping oldest: ${oldest.id} (${oldest.created_at})`);
                others.forEach(dup => {
                    console.log(`  - Marking for deletion: ${dup.id} (${dup.created_at}) | Name: ${dup.name}`);
                    toDelete.push(dup.id);
                });
            }
        }

        console.log(`\nStatistics:`);
        console.log(`- Unique Tags: ${Object.keys(groups).length}`);
        console.log(`- Total Issues to Delete: ${toDelete.length}`);

        if (MODE === 'PURGE') {
            console.log('\nWARNING: DOING REAL PURGE IN 3 SECONDS...');
            await new Promise(r => setTimeout(r, 3000));
            
            for (const id of toDelete) {
                console.log(`Deleting ${id}...`);
                try {
                    await axios.delete(`${BASE_URL}${id}/`, {
                        headers: { 'X-API-Key': PLANE_TOKEN }
                    });
                    console.log(`  [SUCCESS] Deleted ${id}`);
                    // Sleep to avoid rate limiting
                    await new Promise(r => setTimeout(r, 5000));
                } catch (e: any) {
                    console.error(`  [FAILED] Could not delete ${id}:`, e.message);
                }
            }
            console.log('\nPurge complete.');
        } else {
            console.log('\nDry run complete. No deletions performed.');
        }

    } catch (error: any) {
        console.error('Remediation failed:', error.response?.data || error.message);
    }
};

remediate();
