"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const EvidenceRegistryService_1 = require("../EvidenceRegistryService");
(0, globals_1.describe)('EvidenceRegistryService', () => {
    (0, globals_1.it)('stores and reads image/artifact evidence entries', async () => {
        const ticket = `TEST-EVID-${Date.now()}`;
        await (0, EvidenceRegistryService_1.addEvidenceItem)(ticket, {
            type: 'screenshot',
            path: '/tmp/screen.png',
            label: 'playwright-shot',
            createdAt: new Date().toISOString(),
        });
        const out = await (0, EvidenceRegistryService_1.readEvidenceItems)(ticket);
        (0, globals_1.expect)(out.items.length).toBe(1);
        (0, globals_1.expect)(out.items[0]?.type).toBe('screenshot');
    });
});
