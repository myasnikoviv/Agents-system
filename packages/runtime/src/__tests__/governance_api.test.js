"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const governance_1 = require("@system/governance");
const RuleRegistry = __importStar(require("@system/governance"));
// Mock RuleRegistry via @system/governance
jest.mock('@system/governance', () => ({
    ...jest.requireActual('@system/governance'),
    loadGovernanceRules: jest.fn(),
    getRuleById: jest.fn(),
    updateGovernanceRule: jest.fn(),
    disableGovernanceRule: jest.fn(),
}));
describe('Governance API', () => {
    let app;
    const mockRequireRole = jest.fn();
    beforeEach(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        (0, governance_1.registerGovernanceRoutes)(app, { requireRole: mockRequireRole });
        jest.clearAllMocks();
    });
    describe('GET /api/governance/rules', () => {
        it('should return list of rules when authorized', async () => {
            mockRequireRole.mockReturnValue({ userId: 'user-1', role: 'admin' });
            const mockRules = [{ id: 'rule-1', name: 'Rule 1', is_enabled: true }];
            RuleRegistry.loadGovernanceRules.mockReturnValue(mockRules);
            const response = await (0, supertest_1.default)(app).get('/api/governance/rules');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, rules: mockRules });
            expect(mockRequireRole).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'member');
        });
        it('should return 401/403 if requireRole fails', async () => {
            mockRequireRole.mockImplementation((req, res) => {
                res.status(403).json({ error: 'forbidden' });
                return null;
            });
            const response = await (0, supertest_1.default)(app).get('/api/governance/rules');
            expect(response.status).toBe(403);
        });
    });
    describe('GET /api/governance/rules/:id', () => {
        it('should return a specific rule', async () => {
            mockRequireRole.mockReturnValue({ userId: 'user-1', role: 'admin' });
            const mockRule = { id: 'rule-1', name: 'Rule 1' };
            RuleRegistry.getRuleById.mockReturnValue(mockRule);
            const response = await (0, supertest_1.default)(app).get('/api/governance/rules/rule-1');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, rule: mockRule });
            expect(mockRequireRole).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'member');
        });
        it('should return 404 if rule not found', async () => {
            mockRequireRole.mockReturnValue({ userId: 'user-1', role: 'admin' });
            RuleRegistry.getRuleById.mockReturnValue(undefined);
            const response = await (0, supertest_1.default)(app).get('/api/governance/rules/non-existent');
            expect(response.status).toBe(404);
        });
    });
    describe('POST /api/governance/rules/:id', () => {
        it('should update a rule', async () => {
            mockRequireRole.mockReturnValue({ userId: 'user-1', role: 'admin' });
            RuleRegistry.updateGovernanceRule.mockReturnValue(true);
            const response = await (0, supertest_1.default)(app)
                .post('/api/governance/rules/rule-1')
                .send({ name: 'Updated Rule' });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(RuleRegistry.updateGovernanceRule).toHaveBeenCalledWith('rule-1', { name: 'Updated Rule' });
        });
    });
    describe('POST /api/governance/rules/:id/disable', () => {
        it('should disable a rule', async () => {
            mockRequireRole.mockReturnValue({ userId: 'user-1', role: 'admin' });
            RuleRegistry.disableGovernanceRule.mockReturnValue(true);
            const response = await (0, supertest_1.default)(app)
                .post('/api/governance/rules/rule-1/disable')
                .send({ disabled: true });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(RuleRegistry.disableGovernanceRule).toHaveBeenCalledWith('rule-1', { disabled: true });
        });
        it('should disable a rule for a specific project', async () => {
            mockRequireRole.mockReturnValue({ userId: 'user-1', role: 'admin' });
            RuleRegistry.disableGovernanceRule.mockReturnValue(true);
            const response = await (0, supertest_1.default)(app)
                .post('/api/governance/rules/rule-1/disable')
                .send({ disabled: true, project_id: 'proj-1' });
            expect(response.status).toBe(200);
            expect(RuleRegistry.disableGovernanceRule).toHaveBeenCalledWith('rule-1', { disabled: true, project_id: 'proj-1' });
        });
    });
});
