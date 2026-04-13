import fs from 'fs';
import path from 'path';

const extractTickets = (filePath: string) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ticketRegex = /Ticket\s+(AGSYS-\d+)\n\nTitle:\s+(.*?)\n\nScope:\n([\s\S]*?)\n\nAcceptance Criteria:\n([\s\S]*?)(?=\n\n|\n⸻|$)/g;
  
  let match;
  while ((match = ticketRegex.exec(content)) !== null) {
    const [_, id, title, scope, criteria] = match;
    const ticketContent = `# ${title} (${id})\n\n## Scope\n${scope.trim()}\n\n## Acceptance Criteria\n${criteria.trim()}\n\n## Status\n- Pipeline: sprint-35\n- Stage: backlog\n- Owner: TBD\n`;
    
    const targetPath = path.join('docs/process/tickets', `${id}.md`);
    fs.writeFileSync(targetPath, ticketContent, 'utf-8');
    console.log(`Created ticket: ${targetPath}`);
  }
};

const ticketsDir = 'docs/process/tickets';
if (!fs.existsSync(ticketsDir)) {
  fs.mkdirSync(ticketsDir, { recursive: true });
}

extractTickets('docs/sprints/sprint_35_A.md');
extractTickets('docs/sprints/sprint_35_B.md');
