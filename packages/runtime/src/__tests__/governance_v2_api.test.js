"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const governanceRoutes_1 = require("../../server/routes/governanceRoutes");
describe('Governance API v2 (Policy Management)', () => {
    let app;
    beforeAll(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        // Mock requireRole to always succeed as admin
        const mockDeps = {
            requireRole: () => ({ userId: 'test-admin', role: 'admin' })
        };
        (0, governanceRoutes_1.registerGovernanceRoutes)(app, mockDeps);
    });
    describe('POST /api/governance/rules', () => {
        it('should create a new rule with full metadata', async () => {
            const newRule = {
                id: 'test_rule_v2',
                metadata: {
                    name: 'Test Rule v2',
                    description: 'A rule for testing metadata persistence',
                    version: '2.1.0',
                    owner: 'qa-team',
                    tags: ['test', 'v2']
                },
                enforcementMode: 'hard'
            };
            const res = await (0, supertest_1.default)(app)
                .post('/api/governance/rules')
                .send(newRule);
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.rule.id).toBe('test_rule_v2');
            expect(res.body.rule.metadata.version).toBe('2.1.0');
            expect(res.body.rule.metadata.owner).toBe('qa-team');
            expect(res.body.rule.enforcementMode).toBe('hard');
        });
    });
    describe('Project Policy APIs', () => {
        const testProjectId = 'test-project-999';
        it('should get initial project policy', async () => {
            const res = await (0, supertest_1.default)(app)
                .get(`/api/governance/projects/${testProjectId}/policy`);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.policy.projectId).toBe(testProjectId);
            expect(res.body.policy.enabledRules).toBeDefined();
        });
        it('should update project policy', async () => {
            const update = {
                enabledRules: ['test_rule_v2'],
                disabledRules: ['billing_quota_check'],
                executionProfile: 'engineering'
            };
            const res = await (0, supertest_1.default)(app)
                .post(`/api/governance/projects/${testProjectId}/policy`)
                .send(update);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.policy.enabledRules).toContain('test_rule_v2');
            expect(res.body.policy.disabledRules).toContain('billing_quota_check');
            expect(res.body.policy.executionProfile).toBe('engineering');
        });
    });
});
