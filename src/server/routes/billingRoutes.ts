import type express from 'express';
import type { BillingDomainSnapshot } from '../../runtime/billing/BillingDomainModel';
import type { BillingService } from '../../runtime/billing/BillingService';
import { usageMeteringPipeline } from '../../runtime/billing/UsageMeteringPipeline';
import { UsageAggregationService } from '../../runtime/billing/UsageAggregationService';
import type { BillingPaymentService } from '../../runtime/billing/BillingPaymentService';
import type { PaymentWebhookEvent } from '../../runtime/billing/PaymentProvider';
import { evaluateAntiAbuse, validateTenantIsolation } from '../../runtime/billing/AntiAbuseGuard';
import { runBillingConsistencyChecks } from '../../runtime/billing/BillingConsistencyChecks';
import { CostBreakdownService } from '../../runtime/cost/CostBreakdownService';
import { CostGuardrailsService } from '../../runtime/cost/CostGuardrailsService';

interface BillingRouteDeps {
  requireRole: (
    req: express.Request,
    res: express.Response,
    role?: string,
  ) => { userId?: string; role?: string } | null;
  billingService: BillingService;
  paymentService: BillingPaymentService;
}

export function registerBillingRoutes(app: express.Express, deps: BillingRouteDeps): void {
const usageAggregationService = new UsageAggregationService();
const costBreakdownService = new CostBreakdownService();
const costGuardrailsService = new CostGuardrailsService();
  const abuseGuard = (res: express.Response, input: { tenantId: string; actorId: string; actionKey: string }): boolean => {
    const check = evaluateAntiAbuse({ tenantId: input.tenantId, actorId: input.actorId, actionKey: input.actionKey });
    if (!check.allowed) {
      res.status(429).json({ success: false, error: 'anti_abuse_block', reason: check.reason });
      return false;
    }
    return true;
  };

  app.get('/api/system/billing/domain-snapshot', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;
    res.json({ success: true, snapshot: deps.billingService.getSnapshot() });
  });

  app.post('/api/system/billing/domain-snapshot/validate', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;
    const candidate = req.body as BillingDomainSnapshot;
    const validation = deps.billingService.validateSnapshot(candidate);
    if (!validation.ok) {
      res.status(400).json({ success: false, error: 'billing_domain_validation_failed', reason: validation.reason });
      return;
    }
    res.json({ success: true });
  });

  app.put('/api/system/billing/domain-snapshot', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const candidate = req.body as BillingDomainSnapshot;
    const writeResult = deps.billingService.replaceSnapshot(candidate);
    if (!writeResult.ok) {
      res.status(400).json({ success: false, error: 'billing_domain_write_failed', reason: writeResult.reason });
      return;
    }
    res.json({ success: true, snapshot: deps.billingService.getSnapshot() });
  });

  app.get('/api/system/billing/usage/aggregate', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;

    const tenantId = String(req.query?.tenantId || '').trim() || undefined;
    const workspaceId = String(req.query?.workspaceId || '').trim() || undefined;
    const userId = String(req.query?.userId || '').trim() || undefined;
    const periodStartMs = req.query?.periodStartMs ? Number(req.query.periodStartMs) : undefined;
    const periodEndMs = req.query?.periodEndMs ? Number(req.query.periodEndMs) : undefined;

    const result = usageAggregationService.aggregate(usageMeteringPipeline.getRecords(), {
      tenantId,
      workspaceId,
      userId,
      periodStartMs: Number.isFinite(periodStartMs as number) ? periodStartMs : undefined,
      periodEndMs: Number.isFinite(periodEndMs as number) ? periodEndMs : undefined,
    });

    res.json({ success: true, result });
  });

  app.post('/api/system/billing/subscriptions', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const tenantId = String(req.body?.tenantId || '').trim();
    const planId = String(req.body?.planId || '').trim();
    if (!tenantId || !planId) {
      res.status(400).json({ success: false, error: 'tenant_id_and_plan_id_required' });
      return;
    }
    if (!abuseGuard(res, { tenantId, actorId: String(auth.userId || 'unknown'), actionKey: 'billing:create_subscription' })) return;
    const subscription = deps.paymentService.createSubscription({ tenantId, planId });
    res.json({ success: true, subscription });
  });

  app.post('/api/system/billing/subscriptions/:subscriptionId/cancel', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const subscriptionId = String(req.params?.subscriptionId || '').trim();
    const subscription = deps.paymentService.cancelSubscription({ subscriptionId });
    if (!subscription) {
      res.status(404).json({ success: false, error: 'subscription_not_found' });
      return;
    }
    if (!abuseGuard(res, { tenantId: subscription.tenantId, actorId: String(auth.userId || 'unknown'), actionKey: 'billing:cancel_subscription' })) return;
    res.json({ success: true, subscription });
  });

  app.post('/api/system/billing/subscriptions/:subscriptionId/plan', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const subscriptionId = String(req.params?.subscriptionId || '').trim();
    const planId = String(req.body?.planId || '').trim();
    if (!planId) {
      res.status(400).json({ success: false, error: 'plan_id_required' });
      return;
    }
    const subscription = deps.paymentService.updatePlan({ subscriptionId, planId });
    if (!subscription) {
      res.status(404).json({ success: false, error: 'subscription_not_found' });
      return;
    }
    if (!abuseGuard(res, { tenantId: subscription.tenantId, actorId: String(auth.userId || 'unknown'), actionKey: 'billing:update_subscription_plan' })) return;
    res.json({ success: true, subscription });
  });

  app.post('/api/system/billing/webhooks', (req, res) => {
    const event = req.body as PaymentWebhookEvent;
    if (!event || !event.eventId || !event.type || !event.subscriptionId || !event.tenantId) {
      res.status(400).json({ success: false, error: 'invalid_webhook_payload' });
      return;
    }
    if (!abuseGuard(res, { tenantId: event.tenantId, actorId: 'webhook', actionKey: `billing:webhook:${event.type}` })) return;
    const result = deps.paymentService.processWebhook(event);
    const status = result.accepted || result.reason === 'duplicate_event' ? 200 : 400;
    res.status(status).json({ success: status === 200, result });
  });

  app.get('/api/system/billing/subscriptions/dashboard', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;

    const tenantIdFilter = String(req.query?.tenantId || '').trim() || undefined;
    const subscriptions = deps.paymentService
      .listSubscriptions()
      .filter((s) => (tenantIdFilter ? s.tenantId === tenantIdFilter : true))
      .map((s) => ({
        ...s,
        usageOverview: usageAggregationService.aggregate(usageMeteringPipeline.getRecords(), { tenantId: s.tenantId }),
      }));

    const tenants = Array.from(new Set(subscriptions.map((s) => s.tenantId))).map((tenantId) => ({ tenantId }));
    res.json({ success: true, tenants, subscriptions });
  });

  app.get('/api/system/billing/usage/analytics', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;

    const tenantId = String(req.query?.tenantId || '').trim() || undefined;
    const workspaceId = String(req.query?.workspaceId || '').trim() || undefined;
    const userId = String(req.query?.userId || '').trim() || undefined;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const total = usageAggregationService.aggregate(usageMeteringPipeline.getRecords(), {
      tenantId,
      workspaceId,
      userId,
    });
    const last24h = usageAggregationService.aggregate(usageMeteringPipeline.getRecords(), {
      tenantId,
      workspaceId,
      userId,
      periodStartMs: now - dayMs,
      periodEndMs: now,
    });
    const prev24h = usageAggregationService.aggregate(usageMeteringPipeline.getRecords(), {
      tenantId,
      workspaceId,
      userId,
      periodStartMs: now - 2 * dayMs,
      periodEndMs: now - dayMs,
    });
    const trendDelta = last24h.totalQuantity - prev24h.totalQuantity;

    res.json({
      success: true,
      analytics: {
        scope: { tenantId: tenantId || null, workspaceId: workspaceId || null, userId: userId || null },
        total,
        breakdown: total.byType,
        trends: {
          last24h: last24h.totalQuantity,
          previous24h: prev24h.totalQuantity,
          delta: trendDelta,
        },
      },
    });
  });

  app.get('/api/system/billing/cost/breakdown', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;
    const runId = String(req.query?.runId || '').trim() || undefined;
    const projectId = String(req.query?.projectId || '').trim() || undefined;
    const workspaceId = String(req.query?.workspaceId || '').trim() || undefined;
    const limitRaw = Number(req.query?.limit);
    const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;
    const result = costBreakdownService.aggregate(process.cwd(), {
      runId,
      projectId,
      workspaceId,
      limit,
    });
    res.json({
      success: true,
      breakdown: result,
    });
  });

  app.get('/api/system/billing/cost/guardrails', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;
    const projectId = String(req.query?.projectId || '').trim() || undefined;
    const workspaceId = String(req.query?.workspaceId || '').trim() || undefined;
    const dayIsoDate = String(req.query?.day || '').trim() || undefined;
    const result = costGuardrailsService.evaluate(process.cwd(), {
      projectId,
      workspaceId,
      dayIsoDate,
    });
    res.json({
      success: true,
      guardrails: result,
    });
  });

  app.get('/api/workspace/billing', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;
    const tenantId = String(req.query?.tenantId || '').trim();
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'tenant_id_required' });
      return;
    }

    const subscription = deps.paymentService.listSubscriptions().find((s) => s.tenantId === tenantId) || null;
    const usage = usageAggregationService.aggregate(usageMeteringPipeline.getRecords(), { tenantId });
    const plans = deps.billingService.listPlans();
    const currentPlan = subscription ? plans.find((p) => p.planId === subscription.planId) || null : null;
    const quotaRemaining =
      currentPlan && currentPlan.quotaIds.length > 0
        ? (() => {
            const quota = deps.billingService
              .getSnapshot()
              .quotas.find((q) => q.quotaId === currentPlan.quotaIds[0]);
            if (!quota) return null;
            return Math.max(0, quota.limit - usage.totalQuantity);
          })()
        : null;

    res.json({
      success: true,
      billing: {
        tenantId,
        currentPlan,
        subscription,
        usage,
        quotaRemaining,
        upgradeCtaEnabled: true,
      },
    });
  });

  app.post('/api/workspace/billing/subscription/update', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;
    const subscriptionId = String(req.body?.subscriptionId || '').trim();
    const planId = String(req.body?.planId || '').trim();
    if (!subscriptionId || !planId) {
      res.status(400).json({ success: false, error: 'subscription_id_and_plan_id_required' });
      return;
    }
    const updated = deps.paymentService.updatePlan({ subscriptionId, planId });
    if (!updated) {
      res.status(404).json({ success: false, error: 'subscription_not_found' });
      return;
    }
    const isolation = validateTenantIsolation({ tenantId: String(req.body?.tenantId || updated.tenantId), resourceTenantId: updated.tenantId });
    if (!isolation.allowed) {
      res.status(403).json({ success: false, error: 'tenant_isolation_violation' });
      return;
    }
    if (!abuseGuard(res, { tenantId: updated.tenantId, actorId: String(auth.userId || 'unknown'), actionKey: 'workspace:update_subscription' })) return;
    res.json({ success: true, subscription: updated });
  });

  app.post('/api/workspace/billing/subscription/cancel', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;
    const subscriptionId = String(req.body?.subscriptionId || '').trim();
    if (!subscriptionId) {
      res.status(400).json({ success: false, error: 'subscription_id_required' });
      return;
    }
    const cancelled = deps.paymentService.cancelSubscription({ subscriptionId });
    if (!cancelled) {
      res.status(404).json({ success: false, error: 'subscription_not_found' });
      return;
    }
    const isolation = validateTenantIsolation({ tenantId: String(req.body?.tenantId || cancelled.tenantId), resourceTenantId: cancelled.tenantId });
    if (!isolation.allowed) {
      res.status(403).json({ success: false, error: 'tenant_isolation_violation' });
      return;
    }
    if (!abuseGuard(res, { tenantId: cancelled.tenantId, actorId: String(auth.userId || 'unknown'), actionKey: 'workspace:cancel_subscription' })) return;
    res.json({ success: true, subscription: cancelled });
  });

  app.get('/api/system/billing/consistency-checks', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const records = usageMeteringPipeline.getRecords();
    const report = runBillingConsistencyChecks(records);
    res.json({ success: report.ok, report });
  });

  app.get('/api/system/billing/plans', (req, res) => {
    const auth = deps.requireRole(req, res, 'member');
    if (!auth) return;
    res.json({ success: true, plans: deps.billingService.listPlans() });
  });

  app.post('/api/system/billing/plans', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const result = deps.billingService.createPlan(req.body);
    if (!result.ok) {
      res.status(400).json({ success: false, error: 'plan_create_failed', reason: result.reason });
      return;
    }
    res.json({ success: true, plan: result.plan });
  });

  app.patch('/api/system/billing/plans/:planId', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const planId = String(req.params?.planId || '').trim();
    const result = deps.billingService.updatePlan(planId, req.body || {});
    if (!result.ok) {
      res.status(400).json({ success: false, error: 'plan_update_failed', reason: result.reason });
      return;
    }
    res.json({ success: true, plan: result.plan });
  });

  app.delete('/api/system/billing/plans/:planId', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const planId = String(req.params?.planId || '').trim();
    const result = deps.billingService.deletePlan(planId);
    if (!result.ok) {
      res.status(400).json({ success: false, error: 'plan_delete_failed', reason: result.reason });
      return;
    }
    res.json({ success: true });
  });
}
