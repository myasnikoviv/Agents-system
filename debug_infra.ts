
import { resolveRuntimeInfrastructureProfile } from './src/runtime/infrastructure/RuntimeInfrastructureProfile';

const profile = resolveRuntimeInfrastructureProfile(process.env);
console.log('Infrastructure Profile:', JSON.stringify(profile, null, 2));
console.log('Use Shared Worker State (Redis expected):', profile.sharedWorkerStateBackend === 'redis');
