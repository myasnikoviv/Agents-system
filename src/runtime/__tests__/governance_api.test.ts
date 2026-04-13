import express from 'express';
import request from 'supertest';
import { registerGovernanceRoutes } from '../../server/routes/governanceRoutes';
import * as RuleRegistry from '../governance/RuleRegistry';

// Mock RuleRegistry
jest.mock('../governance/RuleRegistry');

describe('Governance API', () => {
  let app: express.Express;
  const mockRequireRole = jest.fn();

  beforeEach(() => {
    app = express();
    app.use(express.json());
    registerGovernanceRoutes(app, { requireRole: mockRequireRole });
    jest.clearAllMocks();
  });

  describe('GET /api/governance/rules', () => {
    it('should return list of rules when authorized', async () => {
      mockRequireRole.mockReturnValue({ userId: 'user-1', role: 'admin' });
      const mockRules = [{ id: 'rule-1', name: 'Rule 1', is_enabled: true }];
      (RuleRegistry.loadGovernanceRules as jest.Mock).mockReturnValue(mockRules);

      const response = await request(app).get('/api/governance/rules');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, rules: mockRules });
      expect(mockRequireRole).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'member');
    });

    it('should return 401/403 if requireRole fails', async () => {
      mockRequireRole.mockImplementation((req, res) => {
        res.status(403).json({ error: 'forbidden' });
        return null;
      });

      const response = await request(app).get('/api/governance/rules');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/governance/rules/:id', () => {
    it('should return a specific rule', async () => {
      mockRequireRole.mockReturnValue({ userId: 'user-1', role: 'admin' });
      const mockRule = { id: 'rule-1', name: 'Rule 1' };
      (RuleRegistry.getRuleById as jest.Mock).mockReturnValue(mockRule);

      const response = await request(app).get('/api/governance/rules/rule-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, rule: mockRule });
      expect(mockRequireRole).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'member');
    });

    it('should return 404 if rule not found', async () => {
      mockRequireRole.mockReturnValue({ userId: 'user-1', role: 'admin' });
      (RuleRegistry.getRuleById as jest.Mock).mockReturnValue(undefined);

      const response = await request(app).get('/api/governance/rules/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/governance/rules/:id', () => {
    it('should update a rule', async () => {
      mockRequireRole.mockReturnValue({ userId: 'user-1', role: 'admin' });
      (RuleRegistry.updateGovernanceRule as jest.Mock).mockReturnValue(true);

      const response = await request(app)
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
      (RuleRegistry.disableGovernanceRule as jest.Mock).mockReturnValue(true);

      const response = await request(app)
        .post('/api/governance/rules/rule-1/disable')
        .send({ disabled: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(RuleRegistry.disableGovernanceRule).toHaveBeenCalledWith('rule-1', { disabled: true });
    });

    it('should disable a rule for a specific project', async () => {
      mockRequireRole.mockReturnValue({ userId: 'user-1', role: 'admin' });
      (RuleRegistry.disableGovernanceRule as jest.Mock).mockReturnValue(true);

      const response = await request(app)
        .post('/api/governance/rules/rule-1/disable')
        .send({ disabled: true, project_id: 'proj-1' });

      expect(response.status).toBe(200);
      expect(RuleRegistry.disableGovernanceRule).toHaveBeenCalledWith('rule-1', { disabled: true, project_id: 'proj-1' });
    });
  });
});
