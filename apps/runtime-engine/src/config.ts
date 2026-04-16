import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

export interface RuntimeEngineConfig {
  port: number;
  host: string;
  planeId: string;
  controlApiUrl: string;
  environment: 'development' | 'production' | 'test';
  workerConcurrency: number;
  dockerEnabled: boolean;
}

export const loadConfig = (): RuntimeEngineConfig => {
  return {
    port: Number(process.env.RUNTIME_PLANE_PORT || '3002'),
    host: process.env.RUNTIME_PLANE_HOST || '127.0.0.1',
    planeId: process.env.RUNTIME_PLANE_ID || `runtime-engine-${uuidv4().slice(0, 8)}`,
    controlApiUrl: process.env.CONTROL_API_URL || 'http://127.0.0.1:3001',
    environment: (process.env.NODE_ENV as any) || 'development',
    workerConcurrency: Number(process.env.RUNTIME_WORKER_CONCURRENCY || '5'),
    dockerEnabled: process.env.RUNTIME_DOCKER_ENABLED === 'true',
  };
};
