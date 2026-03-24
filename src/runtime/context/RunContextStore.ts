import { AsyncLocalStorage } from 'async_hooks';
import { RunContext } from './RunContext';

/**
 * Scoped storage for the active RunContext.
 * Uses AsyncLocalStorage to ensure context is preserved across async boundaries.
 */
export const runContextStorage = new AsyncLocalStorage<RunContext>();

/**
 * Helper to get the current run context.
 */
export function getActiveRunContext(): RunContext | undefined {
  return runContextStorage.getStore();
}

/**
 * Executes a function with a specific run context.
 */
export async function runWithContext<T>(context: RunContext, fn: () => Promise<T>): Promise<T> {
  return runContextStorage.run(context, fn);
}
