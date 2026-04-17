import { signalCollector } from '../src/runtime/adaptive/SignalCollector';
import { patternDetector } from '../src/runtime/adaptive/PatternDetector';
import { getRedisClient } from '../src/runtime/redisClient';

async function verify() {
  const projectId = 'adaptive-threshold-test';
  const redis = getRedisClient();

  console.log('--- Adaptive Thresholds Verification ---');

  // CASE 1: Stable Agent (Low Variance)
  // Low variance means even small spikes should trigger alerts.
  {
    const assetId = 'stable-agent';
    await redis.del(`signals:${projectId}:${assetId}`);
    console.log(`\nTesting ${assetId} (Low Variance)...`);
    
    // History: very stable 1000ms
    for (let i = 0; i < 20; i++) {
        await signalCollector.emit({ type: 'latency', assetId, projectId, value: 1000 });
    }
    // Recent: 1500ms (50% increase, which is a lot for a stable agent)
    for (let i = 0; i < 5; i++) {
        await signalCollector.emit({ type: 'latency', assetId, projectId, value: 1500 });
    }
    await signalCollector.flush();

    const patterns = await patternDetector.detectPatterns(projectId, assetId);
    console.log('Patterns:', JSON.stringify(patterns.map(p => p.type), null, 2));
    
    if (patterns.some(p => p.type === 'LATENCY_DRIFT')) {
      console.log('✅ Stable Agent Spike Detected (Expected)');
    } else {
      console.error('❌ Stable Agent Spike MISSED');
    }
  }

  // CASE 2: High Variance Agent
  // High variance means 50% increase might be 'normal' jitter.
  {
    const assetId = 'noisy-agent';
    await redis.del(`signals:${projectId}:${assetId}`);
    console.log(`\nTesting ${assetId} (High Variance)...`);

    // History: noisy 500ms - 5000ms (Mean ~2750ms, large stdDev)
    for (let i = 0; i < 20; i++) {
        const val = i % 2 === 0 ? 500 : 5000;
        await signalCollector.emit({ type: 'latency', assetId, projectId, value: val });
    }
    // Recent: 5500ms (Only 10% above the peak noise, should be within Z-score < 2)
    for (let i = 0; i < 5; i++) {
        await signalCollector.emit({ type: 'latency', assetId, projectId, value: 5500 });
    }
    await signalCollector.flush();

    const patterns = await patternDetector.detectPatterns(projectId, assetId);
    console.log('Patterns:', JSON.stringify(patterns.map(p => p.type), null, 2));

    if (patterns.every(p => p.type !== 'LATENCY_DRIFT')) {
      console.log('✅ High Variance Jitter Ignored (Expected)');
    } else {
      console.error('❌ High Variance Jitter Triggered UNWANTED Alert');
    }
  }

  process.exit(0);
}

verify().catch(console.error);
