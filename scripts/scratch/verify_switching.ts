import { applyPerformanceAwarePolicy, ModelRouteDecision } from '../src/runtime/adaptive/AdaptiveIntelligenceEngine';
import { signalCollector } from '../src/runtime/adaptive/SignalCollector';
import { getRedisClient } from '../src/runtime/redisClient';
import path from 'path';

async function verify() {
  const projectId = 'switch-test-project';
  const assetId = 'adaptive-agent';
  const workspacePath = process.cwd();
  const redis = getRedisClient();

  console.log('--- Dynamic Model Switching Verification ---');

  // 1. Clear previous test data
  await redis.del(`signals:${projectId}:${assetId}`);

  // 2. Mock 'deteriorating' state (inject critical failure pattern)
  console.log('Injecting critical deterioration signals...');
  for (let i = 0; i < 15; i++) {
    // History (Success)
    await signalCollector.emit({ type: 'latency', assetId, projectId, value: 500 });
  }
  for (let i = 0; i < 5; i++) {
    // Recent (Failure)
    await signalCollector.emit({ type: 'failure', assetId, projectId, value: 'crash' });
    await signalCollector.emit({ type: 'latency', assetId, projectId, value: 5000 });
  }
  await signalCollector.flush();

  // 3. Define initial decision (Cheap tier)
  const initialDecision: ModelRouteDecision = {
    runId: 'test-run',
    projectId,
    taskType: 'general',
    modelTier: 'cheap',
    model: 'gpt-4o-mini',
    reason: 'initial'
  };

  // 4. Run Adaptive Engine
  console.log('Running adaptive routing...');
  const finalDecision = await applyPerformanceAwarePolicy({
    workspacePath,
    projectId,
    assetId,
    decision: initialDecision
  });

  console.log('Initial Decision:', JSON.stringify(initialDecision, null, 2));
  console.log('Final Decision:', JSON.stringify(finalDecision, null, 2));

  // Assertions
  if (finalDecision.modelTier === 'expensive' && finalDecision.reason.includes('CRITICAL_DETERIORATION')) {
    console.log('✅ Recovery (Upgrade) Logic PASSED');
  } else {
    console.error('❌ Recovery Logic FAILED');
  }

  // 5. Test cost-saver trial
  console.log('\nTesting cost-saver trial (stable state)...');
  await redis.del(`signals:${projectId}:${assetId}`);
  for (let i = 0; i < 20; i++) {
    await signalCollector.emit({ type: 'latency', assetId, projectId, value: 500 });
  }
  await signalCollector.flush();

  const expensiveDecision: ModelRouteDecision = {
    runId: 'test-run-2',
    projectId,
    taskType: 'general',
    modelTier: 'expensive',
    model: 'gpt-4.1',
    reason: 'initial'
  };

  const costSaverDecision = await applyPerformanceAwarePolicy({
    workspacePath,
    projectId,
    assetId,
    decision: expensiveDecision,
    mode: 'cost_saver'
  });

  console.log('Cost Saver Results:', JSON.stringify(costSaverDecision, null, 2));

  if (costSaverDecision.modelTier === 'medium' && costSaverDecision.reason.includes('STABLE_COST_SAVER')) {
    console.log('✅ Cost-Saver Trial Logic PASSED');
  } else {
    console.error('❌ Cost-Saver Trial Logic FAILED');
  }

  process.exit(0);
}

verify().catch(console.error);
