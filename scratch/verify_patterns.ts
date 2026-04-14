import { signalCollector } from '../src/runtime/adaptive/SignalCollector';
import { patternDetector } from '../src/runtime/adaptive/PatternDetector';
import { getRedisClient } from '../src/runtime/redisClient';

async function verify() {
  const projectId = 'pattern-test-project';
  const assetId = 'deteriorating-agent';
  const redis = getRedisClient();

  console.log('--- Pattern Detection Verification ---');

  // 1. Clear previous test data
  await redis.del(`signals:${projectId}:${assetId}`);

  // 2. Inject Historical baseline (20 successes, low latency)
  console.log('Injecting historical baseline...');
  for (let i = 0; i < 20; i++) {
    await signalCollector.emit({
      type: 'latency',
      assetId,
      projectId,
      value: 1000,
    });
    await signalCollector.emit({
      type: 'token_usage',
      assetId,
      projectId,
      value: 1000,
    });
  }

  // 3. Inject Recent deterioration (5 failures, high latency)
  console.log('Injecting recent deterioration...');
  for (let i = 0; i < 5; i++) {
    await signalCollector.emit({
      type: 'latency',
      assetId,
      projectId,
      value: 5000, // Latency spike
    });
    await signalCollector.emit({
      type: 'failure',
      assetId,
      projectId,
      value: 'timeout',
    });
    await signalCollector.emit({
      type: 'token_usage',
      assetId,
      projectId,
      value: 5000, // Token spike
    });
  }

  // Flush buffer to redis
  await signalCollector.flush();

  // 4. Run Detector
  console.log('Running analysis...');
  const patterns = await patternDetector.detectPatterns(projectId, assetId);

  console.log('Detected Patterns:', JSON.stringify(patterns, null, 2));

  // Assertions
  const hasDeterioration = patterns.some(p => p.type === 'SUCCESS_DETERIORATION');
  const hasLatencyDrift = patterns.some(p => p.type === 'LATENCY_DRIFT');
  const hasTokenSpike = patterns.some(p => p.type === 'TOKEN_SPIKE');

  if (hasDeterioration && hasLatencyDrift && hasTokenSpike) {
    console.log('✅ Pattern Detection Verification PASSED');
  } else {
    console.error('❌ Pattern Detection Verification FAILED');
    if (!hasDeterioration) console.error('- SUCCESS_DETERIORATION missing');
    if (!hasLatencyDrift) console.error('- LATENCY_DRIFT missing');
    if (!hasTokenSpike) console.error('- TOKEN_SPIKE missing');
  }

  process.exit(0);
}

verify().catch(console.error);
