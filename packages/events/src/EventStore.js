"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStore = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const LEDGER_DIR = path_1.default.resolve(process.cwd(), 'docs/process/runs/ledger');
class EventStore {
    /**
     * Fetches all events for a specific run.
     */
    static async getEventsByRunId(runId) {
        const filePath = path_1.default.join(LEDGER_DIR, `${runId}.jsonl`);
        try {
            const content = await promises_1.default.readFile(filePath, 'utf-8');
            return content
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                const ledgerEntry = JSON.parse(line);
                // Re-hydrate the original payload if needed, 
                // or just return the event if we decide to store full events in ledger.
                // For now, RunLedger stores a flattened LedgerEntry.
                // We should ideally store the raw RuntimeEvent in the ledger file for full fidelity.
                return ledgerEntry;
            });
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Fetches the filtered chat view (agent.message events) for a thread.
     * This implements the 'Chat is a filtered view' requirement.
     */
    static async getChatMessages(runIds) {
        const allEvents = [];
        for (const runId of runIds) {
            const runEvents = await this.getEventsByRunId(runId);
            allEvents.push(...runEvents);
        }
        return allEvents
            .filter(e => e.type === 'agent.message')
            .map(e => ({
            id: e.id,
            role: 'agent',
            content: e.payload.message || e.payload.content,
            timestamp: new Date(e.timestamp).toISOString()
        }));
    }
}
exports.EventStore = EventStore;
