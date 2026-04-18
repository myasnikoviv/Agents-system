import { signalCollector } from '../src/runtime/adaptive/SignalCollector';
import { signalAggregator } from '../src/runtime/adaptive/SignalAggregator';
import { getRedisClient } from '../src/runtime/redisClient';

async function verify() {
  const projectId = 'agg-test-project';
  const assetId = 'agg-test-agent';
  const redis = getRedisClient();

  console.log('--- Aggregation Verification ---');

  // 1. Clear previous test data
  await redis.del(`signals:${projectId}:${assetId}`);

  // 2. Inject 10 successful interactions (latency + token)
  for (let i = 0; i < 10; i++) {
    await signalCollector.emit({
      type: 'latency',
      assetId,
      projectId,
      value: 1000 + (i * 100), // Latencies: 1000, 1100, ..., 1900
    });
    await signalCollector.emit({
      type: 'token_usage',
      assetId,
      projectId,
      value: 1000,
    });
  }

  // 3. Inject 2 failures
  for (let i = 0; i < 2; i++) {
    await signalCollector.emit({
      type: 'failure',
      assetId,
      projectId,
      value: 'timeout',
    });
  }

  // Flush buffer to redis
  await signalCollector.flush();

  // 4. Run Aggregator
  const score = await signalAggregator.aggregateSignals(projectId, assetId);

  if (!score) {
    console.error('❌ Aggregation Verification FAILED: No score returned');
    process.exit(1);
  }

  console.log('Aggregation Result:', JSON.stringify(score, null, 2));

  // Assertions
  // invocationCount should be 10 (from 10 latencies)
  // successfulTaskCount should be 8 (10 latencies - 2 failures)
  // avgLatency should be 1450ms (sum(1000...1900)/10)
  
  const successRateOk = score.successRate === 0.8;
  const latencyOk = score.latencyMs === 1450;
  const tokensOk = score.tokenUsage === 10000;

  if (successRateOk && latencyOk && tokensOk) {
    console.log('✅ Aggregation Verification PASSED');
  } else {
    console.error('❌ Aggregation Verification FAILED: Data mismatch');
    console.log(`SuccessRate: ${score.successRate} (expected 0.8)`);
    console.log(`Latency: ${score.latencyMs} (expected 1450)`);
    console.log(`Tokens: ${score.tokenUsage} (expected 10000)`);
  }

  process.exit(0);
}

verify().catch(console.error);
