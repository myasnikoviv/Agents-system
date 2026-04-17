import { evaluateMidExecutionQuota } from '@system/billing';

describe('MidExecutionQuotaController', () => {
  it('continues execution when under quota', () => {
    const result = evaluateMidExecutionQuota({
      quota: {
        quotaId: 'q1',
        tenantId: 't1',
        type: 'tokens',
        period: 'month',
        limit: 1000,
      },
      state: { consumedUsage: 800 },
      incrementUsage: 150,
    });
    expect(result.continueExecution).toBe(true);
  });

  it('stops execution when hard limit exceeded mid-run', () => {
    const result = evaluateMidExecutionQuota({
      quota: {
        quotaId: 'q1',
        tenantId: 't1',
        type: 'tokens',
        period: 'month',
        limit: 1000,
      },
      state: { consumedUsage: 950 },
      incrementUsage: 60,
    });
    expect(result.continueExecution).toBe(false);
    expect(result.reason).toBe('quota_hard_limit_exceeded');
  });
});

