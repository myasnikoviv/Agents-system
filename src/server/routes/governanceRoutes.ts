import type express from 'express';
import { 
  loadGovernanceRules, 
  getRuleById, 
  updateGovernanceRule, 
  disableGovernanceRule 
} from '../../runtime/governance/RuleRegistry';

interface GovernanceRouteDeps {
  requireRole: (
    req: express.Request,
    res: express.Response,
    role?: string,
  ) => { userId?: string; role?: string } | null;
}

/**
 * Registers REST API routes for Governance Rule management.
 * 
 * Endpoints:
 * - GET  /api/governance/rules          : List all rules
 * - GET  /api/governance/rules/:id      : Get specific rule
 * - POST /api/governance/rules/:id      : Update rule (metadata, config)
 * - POST /api/governance/rules/:id/disable : Enable/Disable rule
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
        project_id
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
}
