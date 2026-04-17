import { signalCollector } from '../src/runtime/adaptive/SignalCollector';
import { getRedisClient } from '../src/runtime/redisClient';

async function verify() {
  const projectId = 'test-project';
  const assetId = 'test-agent';
  const redis = getRedisClient();

  console.log('--- Telemetry Verification ---');

  // 1. Emit mock signals
  await signalCollector.emit({
    type: 'latency',
    assetId,
    projectId,
    value: 1234,
    metadata: { test: true }
  });

  await signalCollector.emit({
    type: 'token_usage',
    assetId,
    projectId,
    value: 5000,
    metadata: { test: true }
  });

  await signalCollector.emit({
    type: 'failure',
    assetId,
    projectId,
    value: 'crash',
    metadata: { test: true }
  });

  // Flush buffer
  await signalCollector.flush();

  // 2. Read from Redis
  const key = `signals:${projectId}:${assetId}`;
  const rawSignals = await redis.lrange(key, 0, -1);
  const signals = rawSignals.map(s => JSON.parse(s));

  console.log(`Found ${signals.length} signals in Redis.`);
  
  const hasLatency = signals.some(s => s.type === 'latency' && s.value === 1234);
  const hasTokens = signals.some(s => s.type === 'token_usage' && s.value === 5000);
  const hasFailure = signals.some(s => s.type === 'failure' && s.value === 'crash');

  if (hasLatency && hasTokens && hasFailure) {
    console.log('✅ Telemetry Verification PASSED');
  } else {
    console.error('❌ Telemetry Verification FAILED');
    console.log('Fetched signals:', JSON.stringify(signals, null, 2));
  }

  process.exit(0);
}

verify().catch(console.error);
