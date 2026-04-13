import type express from 'express';
import { 
  loadGovernanceRules, 
  getRuleById, 
  updateGovernanceRule, 
  disableGovernanceRule,
  createGovernanceRule 
} from '../../runtime/governance/RuleRegistry';
import { 
  getProjectPolicy, 
  updateProjectPolicy 
} from '../../runtime/governance/ProjectPolicyBinding';

interface GovernanceRouteDeps {
  requireRole: (
    req: express.Request,
    res: express.Response,
    role?: string,
  ) => { userId?: string; role?: string } | null;
}

/**
 * Registers REST API routes for Governance Rule and Policy management.
 * 
 * Endpoints:
 * - GET  /api/governance/rules          : List all rules
 * - POST /api/governance/rules          : Create new rule (AGSYS-2403)
 * - GET  /api/governance/rules/:id      : Get specific rule
 * - POST /api/governance/rules/:id      : Update rule (metadata, config)
 * - POST /api/governance/rules/:id/disable : Enable/Disable rule
 * - GET  /api/governance/projects/:projectId/policy : Get project policy (AGSYS-2408)
 * - POST /api/governance/projects/:projectId/policy : Update project policy (AGSYS-2409)
 */
export function registerGovernanceRoutes(app: express.Express, deps: GovernanceRouteDeps): void {
  
  // AGSYS-2402: Rule Get API (List all)
  app.get('/api/governance/rules', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;

    try {
      const rules = loadGovernanceRules();
      res.json({ success: true, rules });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'governance_list_failed', 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // AGSYS-2403: Rule Create API
  app.post('/api/governance/rules', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;

    try {
      const rule = createGovernanceRule(req.body);
      res.status(201).json({ success: true, rule });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: 'governance_create_failed', 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // AGSYS-2402: Rule Get API (Specific)
  app.get('/api/governance/rules/:id', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;

    try {
      const rule = getRuleById(req.params.id);
      if (!rule) {
        return res.status(404).json({ success: false, error: 'governance_rule_not_found' });
      }
      res.json({ success: true, rule });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'governance_get_failed', 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // AGSYS-2404: Rule Update API
  app.post('/api/governance/rules/:id', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;

    try {
      const updated = updateGovernanceRule(req.params.id, req.body);
      res.json({ success: true, rule: updated });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: 'governance_update_failed', 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // AGSYS-2405: Rule Disable API
  app.post('/api/governance/rules/:id/disable', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;

    try {
      const { disabled, project_id } = req.body;
      const updated = disableGovernanceRule(req.params.id, { 
        disabled: disabled !== false,
        projectId: project_id
      });
      res.json({ success: true, rule: updated });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: 'governance_disable_failed', 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // AGSYS-2408: Project Policy API (Get)
  app.get('/api/governance/projects/:projectId/policy', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;

    try {
      const policy = getProjectPolicy(req.params.projectId);
      res.json({ success: true, policy });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'governance_policy_get_failed', 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // AGSYS-2409: Project Policy API (Update)
  app.post('/api/governance/projects/:projectId/policy', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;

    try {
      const policy = updateProjectPolicy(req.params.projectId, req.body);
      res.json({ success: true, policy });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: 'governance_policy_update_failed', 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // AGSYS-2423: Action Audit Log API
  app.get('/api/governance/logs', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;

    try {
      const ticketId = req.query.ticketId as string | undefined;
      const { readGovernanceLogs } = require('../../runtime/governance/GovernanceLogger');
      const logs = readGovernanceLogs(ticketId);
      res.json({ success: true, logs });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'governance_logs_fetch_failed', 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Manual Overrides API (Proxy to Registry)
  app.get('/api/governance/overrides', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;

    try {
      const projectId = req.query.projectId as string | undefined;
      const { listManualOverrides } = require('../../runtime/governance/ManualOverrideRegistry');
      let overrides = listManualOverrides(process.cwd());
      if (projectId) {
        overrides = overrides.filter(o => o.projectId === projectId);
      }
      res.json({ success: true, overrides });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'governance_overrides_fetch_failed', 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post('/api/governance/overrides', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;

    try {
      const { addManualOverride } = require('../../runtime/governance/ManualOverrideRegistry');
      const override = addManualOverride({
        ...req.body,
        actorId: auth.userId || 'unknown'
      }, process.cwd());
      res.status(201).json({ success: true, override });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: 'governance_override_create_failed', 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });
}
