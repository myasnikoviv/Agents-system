"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const CockpitChainsState_1 = require("../CockpitChainsState");
describe('CockpitChainsState', () => {
    it('falls back to defaults when file is missing', async () => {
        const tmp = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'cockpit-chains-'));
        const missing = path_1.default.join(tmp, 'missing.json');
        const defaultState = (0, CockpitChainsState_1.defaultChainsState)();
        const loaded = (0, CockpitChainsState_1.loadChainsState)(missing, defaultState);
        expect(Object.keys(loaded.threadsByProject)).toContain('agent_system');
    });
    it('persists and reloads state', async () => {
        const tmp = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'cockpit-chains-'));
        const file = path_1.default.join(tmp, 'state.json');
        const state = {
            threadsByProject: {
                agent_system: [{ id: 't1', label: 'Thread 1', updatedAt: '2026-03-22T00:00:00Z' }],
            },
        };
        (0, CockpitChainsState_1.persistChainsState)(file, state);
        const loaded = (0, CockpitChainsState_1.loadChainsState)(file, (0, CockpitChainsState_1.defaultChainsState)());
        expect(loaded.threadsByProject.agent_system[0].id).toBe('t1');
    });
});
