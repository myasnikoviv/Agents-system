"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const globals_1 = require("@jest/globals");
const DecouplingComplianceService_1 = require("../DecouplingComplianceService");
(0, globals_1.describe)('DecouplingComplianceService', () => {
    (0, globals_1.it)('generates compliance matrix artifact and returns rows', async () => {
        const out = await (0, DecouplingComplianceService_1.generateDecouplingComplianceMatrix)();
        (0, globals_1.expect)(out.rows.length).toBeGreaterThan(0);
        (0, globals_1.expect)(out.rows.every((r) => r.status === 'ok' || r.status === 'gap')).toBe(true);
        const content = await promises_1.default.readFile(out.artifactPath, 'utf-8');
        (0, globals_1.expect)(content).toContain('AGSYS-23 Decoupling Compliance Matrix');
        (0, globals_1.expect)(content).toContain('| Control | Source of Truth | Runtime Implementation | Status |');
    });
});
