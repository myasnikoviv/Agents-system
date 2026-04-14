import { MeetingViewPayload, MemoryInsightPayload, MemoryInsightItem, MeetingTurnView } from '../context/types';

export const toRenderableMarkdown = (raw: string): string =>
    String(raw || '').replace(
        /<execute_tool>\s*([\s\S]*?)\s*<\/execute_tool>/gi,
        (_match, inner) => `\n\`\`\`bash\n${String(inner || '').trim()}\n\`\`\`\n`
    );

export const parseMeetingViewPayload = (raw: string): MeetingViewPayload | null => {
    const content = String(raw || '');
    if (!content.trim()) return null;

    const markerIdx = content.indexOf('MEETING_VIEW:');
    if (markerIdx >= 0) {
        const jsonPart = content.slice(markerIdx + 'MEETING_VIEW:'.length).trim();
        try {
            const parsed = JSON.parse(jsonPart) as MeetingViewPayload;
            if (Array.isArray(parsed.turns) && parsed.turns.length > 0) {
                return {
                    title: parsed.title || 'Meeting',
                    turns: parsed.turns.map((t) => ({
                        role: String(t.role || 'agent'),
                        round: Number.isFinite(Number(t.round)) ? Number(t.round) : undefined,
                        text: String(t.text || ''),
                    })),
                    decision: parsed.decision ? String(parsed.decision) : undefined,
                };
            }
        } catch { }
    }

    const turns: MeetingTurnView[] = [];
    let decision: string | undefined;
    const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
        const decisionMatch = line.match(/^decision\s*:\s*(.+)$/i);
        if (decisionMatch) {
            decision = decisionMatch[1].trim();
            continue;
        }
        const turnMatch = line.match(/^round\s*(\d+)\s*[:|\-]?\s*([a-z0-9_\- ]+)\s*:\s*(.+)$/i);
        if (turnMatch) {
            turns.push({
                round: Number(turnMatch[1]),
                role: turnMatch[2].trim(),
                text: turnMatch[3].trim(),
            });
        }
    }
    if (turns.length === 0 && !decision) return null;
    return { title: 'Meeting', turns, decision };
};

export const parseMemoryInsightPayload = (raw: string): MemoryInsightPayload | null => {
    const content = String(raw || '');
    if (!content.trim()) return null;

    const markerIdx = content.indexOf('MEMORY_INSIGHT:');
    if (markerIdx >= 0) {
        const jsonPart = content.slice(markerIdx + 'MEMORY_INSIGHT:'.length).trim();
        try {
            const parsed = JSON.parse(jsonPart) as MemoryInsightPayload;
            if (Array.isArray(parsed.items) && parsed.items.length > 0) {
                return {
                    title: parsed.title || 'Related Memory',
                    items: parsed.items.map((it) => ({
                        id: String(it.id || ''),
                        text: String(it.text || ''),
                        sourceLabel: it.sourceLabel ? String(it.sourceLabel) : undefined,
                        sourceHref: it.sourceHref ? String(it.sourceHref) : undefined,
                    })),
                };
            }
        } catch { }
    }

    const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
    const startIdx = lines.findIndex((line) => /^related memory\s*:/i.test(line));
    if (startIdx < 0) return null;
    const items: MemoryInsightItem[] = [];
    for (let i = startIdx + 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (!line.startsWith('-')) break;
        const stripped = line.replace(/^-+\s*/, '');
        const match = stripped.match(/^\[([^\]]+)\]\s*(.+?)(?:\s*\(source:\s*([^)]+)\))?$/i);
        if (match) {
            const href = match[3] && /^(https?:\/\/|\/)/i.test(match[3].trim()) ? match[3].trim() : undefined;
            items.push({
                id: match[1].trim(),
                text: match[2].trim(),
                sourceLabel: match[3] ? match[3].trim() : undefined,
                sourceHref: href,
            });
        } else {
            items.push({ id: `item-${i}`, text: stripped });
        }
    }
    if (items.length === 0) return null;
    return { title: 'Related Memory', items };
};
