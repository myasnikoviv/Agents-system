"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SkillProvider_1 = require("../SkillProvider");
(0, globals_1.describe)('SkillProvider role rules', () => {
    (0, globals_1.it)('always includes pipeline-selection for pm-orchestrator default selection', async () => {
        const result = await SkillProvider_1.SkillProvider.loadSkillsForRole('pm-orchestrator', 'Need help with task');
        (0, globals_1.expect)(result.selected.length).toBeGreaterThan(0);
        (0, globals_1.expect)(result.selected.some((s) => s.id === 'pipeline-selection')).toBe(true);
    });
    (0, globals_1.it)('provides explicit rules for every selected PM skill', async () => {
        const result = await SkillProvider_1.SkillProvider.loadSkillsForRole('pm-orchestrator', 'Wrong branch recovery and pipeline routing issue');
        (0, globals_1.expect)(result.selected.length).toBeGreaterThan(0);
        for (const skill of result.selected) {
            (0, globals_1.expect)(skill.rule.useWhen.length).toBeGreaterThan(0);
            (0, globals_1.expect)(skill.rule.avoidWhen.length).toBeGreaterThan(0);
        }
    });
});
