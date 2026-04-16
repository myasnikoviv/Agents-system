import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { loadServiceRegistry } from '@system/runtime';
import { LocalProcessAdapter } from '@system/runtime';
import { DockerAdapter } from '@system/runtime';
import { ServiceExecutionAdapterRegistry } from '@system/runtime';
import { ControlApiRuntimeManager } from '@system/runtime';
import { ServiceLifecycleEventBus } from '@system/runtime';
import { BillingService } from '@system/billing';
import { BillingPaymentService } from '@system/billing';
import { StripeMvpProvider } from '@system/billing';
import { UsageAggregationService } from '@system/billing';

export const resolveControlApiServerConfig = () => ({
  port: Number(process.env.AGENT_SYSTEM_BACKEND_PORT || process.env.PORT || '3001'),
  host: process.env.AGENT_SYSTEM_BACKEND_HOST || '127.0.0.1',
});

export type ApiMetricsState = {
  requestsTotal: number;
  errorsTotal: number;
  byRoute: Map<string, number>;
  byStatusClass: Map<string, number>;
  totalLatencyMs: number;
};

export type ApiTraceSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  runId?: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
};

export const createApiMetricsState = (): ApiMetricsState => ({
  requestsTotal: 0,
  errorsTotal: 0,
  byRoute: new Map<string, number>(),
  byStatusClass: new Map<string, number>(),
  totalLatencyMs: 0,
});

export const createApiTraceSpans = (): ApiTraceSpan[] => [];

export const registerApiTelemetryMiddleware = (
  app: express.Express,
  apiMetricsState: ApiMetricsState,
  apiTraceSpans: ApiTraceSpan[],
  appendStructuredLog: (entry: {
    level: 'info' | 'warn' | 'error';
    source: string;
    message: string;
    meta?: Record<string, any>;
  }) => void,
) => {
  app.use((req, res, next) => {
    const startedAt = Date.now();
    const traceId = String(req.header('x-trace-id') || req.header('x-request-id') || crypto.randomUUID());
    const spanId = crypto.randomUUID().slice(0, 16);
    const parentSpanId = String(req.header('x-parent-span-id') || '').trim() || undefined;
    const runId = String(req.header('x-run-id') || req.query?.runId || req.body?.runId || '').trim() || undefined;
    res.setHeader('x-trace-id', traceId);
    res.setHeader('x-span-id', spanId);
    res.on('finish', () => {
      const routeKey = `${req.method} ${req.path}`;
      const statusClass = `${Math.floor((res.statusCode || 0) / 100)}xx`;
      apiMetricsState.requestsTotal += 1;
      if ((res.statusCode || 0) >= 400) apiMetricsState.errorsTotal += 1;
      apiMetricsState.totalLatencyMs += Math.max(0, Date.now() - startedAt);
      apiMetricsState.byRoute.set(routeKey, Number(apiMetricsState.byRoute.get(routeKey) || 0) + 1);
      apiMetricsState.byStatusClass.set(statusClass, Number(apiMetricsState.byStatusClass.get(statusClass) || 0) + 1);
      apiTraceSpans.push({
        traceId,
        spanId,
        ...(parentSpanId ? { parentSpanId } : {}),
        ...(runId ? { runId } : {}),
        method: req.method,
        path: req.path,
        statusCode: Number(res.statusCode || 0),
        durationMs: Math.max(0, Date.now() - startedAt),
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date().toISOString(),
      });
      if (apiTraceSpans.length > 5000) {
        apiTraceSpans.splice(0, apiTraceSpans.length - 5000);
      }
      appendStructuredLog({
        level: (res.statusCode || 0) >= 500 ? 'error' : (res.statusCode || 0) >= 400 ? 'warn' : 'info',
        source: 'http',
        message: `${req.method} ${req.path}`,
        meta: {
          statusCode: Number(res.statusCode || 0),
          durationMs: Math.max(0, Date.now() - startedAt),
          traceId,
          spanId,
          ...(runId ? { runId } : {}),
        },
      });
    });
    next();
  });
};

export const registerProcessDiagnosticsHandlers = (
  appendStructuredLog: (entry: {
    level: 'info' | 'warn' | 'error';
    source: string;
    message: string;
    meta?: Record<string, any>;
  }) => void,
) => {
  process.on('uncaughtException', (error) => {
    console.error('[agent-system-backend] uncaughtException:', error);
    appendStructuredLog({
      level: 'error',
      source: 'process',
      message: 'uncaught_exception',
      meta: { error: String((error as any)?.message || error) },
    });
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[agent-system-backend] unhandledRejection:', reason);
    appendStructuredLog({
      level: 'error',
      source: 'process',
      message: 'unhandled_rejection',
      meta: { reason: String((reason as any)?.message || reason) },
    });
  });
};

export const createControlApiBootstrapDependencies = () => {
  const controlApiRegistrySource = path.resolve(process.cwd(), 'config/control-api/service-registry.yaml');
  const loadedControlApiRegistry = loadServiceRegistry(controlApiRegistrySource).registry;
  const controlApiAdapterRegistry = new ServiceExecutionAdapterRegistry();
  const controlApiEventBus = new ServiceLifecycleEventBus();
  controlApiAdapterRegistry.register(new LocalProcessAdapter());
  controlApiAdapterRegistry.register(new DockerAdapter());

  return {
    controlApiRuntimeManager: new ControlApiRuntimeManager(
      loadedControlApiRegistry,
      controlApiAdapterRegistry,
      controlApiEventBus,
    ),
    billingService: new BillingService(),
    billingPaymentService: new BillingPaymentService(new StripeMvpProvider()),
    usageAggregationService: new UsageAggregationService(),
  };
};
