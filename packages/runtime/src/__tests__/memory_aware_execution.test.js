"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const memory_1 = require("@system/memory");
const memory_2 = require("@system/memory");
const memory_3 = require("@system/memory");
describe('MemoryAwareExecution', () => {
    it('injects relevant memory into run context shared facts', async () => {
        const engine = {};
        jest.spyOn(memory_2.SharedMemoryStorageEngine, 'createDefault').mockReturnValue(engine);
        jest
            .spyOn(memory_3.UnifiedMemoryApiService.prototype, 'getRelevantMemory')
            .mockResolvedValue([
            {
                entity: {
                    id: 'm2',
                    type: 'decision',
                    content: 'A lower score item',
                    version: 1,
                    metadata: { author: 'pm', timestamp: 1, workspace_id: 'ws' },
                },
                score: 0.61,
            },
            {
                entity: {
                    id: 'm1',
                    type: 'decision',
                    content: 'Use memory-aware execution with prioritized context',
                    version: 1,
                    metadata: { author: 'pm', timestamp: 1, workspace_id: 'ws' },
                },
                score: 0.91,
            },
        ]);
        const context = {
            tenantId: 't1',
            workspaceId: 'ws',
            projectId: 'p1',
            task: { rawUserInput: 'how to execute with memory' },
            memory: { sharedFacts: {} },
        };
        await (0, memory_1.injectRelevantMemoryIntoContext)(context, context.task.rawUserInput, {
            maxItems: 1,
            maxTotalChars: 30,
            maxItemChars: 20,
        });
        expect(Array.isArray(context.memory.sharedFacts.__relevant_memory)).toBe(true);
        expect(context.memory.sharedFacts.__relevant_memory[0].id).toBe('m1');
        expect(context.memory.sharedFacts.__relevant_memory[0].content.length).toBeLessThanOrEqual(20);
        expect(context.memory.sharedFacts.__relevant_memory_meta.total_items).toBe(1);
        expect(context.memory.sharedFacts.__relevant_memory_meta.total_chars).toBeLessThanOrEqual(30);
    });
});
