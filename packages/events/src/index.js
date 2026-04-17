"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchEventsByRunId = exports.fetchRecentEvents = exports.emitGuardBlockEvent = exports.emitSwarmEvent = exports.emitEvent = exports.globalEventBus = exports.EventBusCore = void 0;
const uuid_1 = require("uuid");
const EventStore_1 = require("./EventStore");
class EventBusCore {
    subscribers = new Set();
    redis;
    streamKey;
    constructor(options = {}) {
        this.redis = options.redisClient;
        this.streamKey = options.streamKey || 'events:runtime_hub';
    }
    /**
     * Register a persistent side-effect (e.g., Billing, Ledger) as a subscriber.
     */
    subscribe(handler) {
        this.subscribers.add(handler);
        return () => this.subscribers.delete(handler);
    }
    /**
     * Emit an event to the global stream and notify all subscribers.
     */
    async emit(event) {
        const fullEvent = {
            ...event,
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
        };
        let messageId = 'local-' + fullEvent.id;
        // 1. Persist to Redis Stream (if client provided)
        if (this.redis && typeof this.redis.xadd === 'function') {
            try {
                const result = await this.redis.xadd(this.streamKey, '*', 'data', JSON.stringify(fullEvent));
                if (result)
                    messageId = result;
            }
            catch (err) {
                console.error(`[EventBus] Redis emission failed for ${fullEvent.type}:`, err);
            }
        }
        // 2. Notify Subscribers (Side-effects)
        // We run them in parallel but ensure they don't block the caller if they fail.
        const tasks = Array.from(this.subscribers).map(async (handler) => {
            try {
                await handler(fullEvent);
            }
            catch (err) {
                console.error(`[EventBus] Subscriber failed for ${fullEvent.type}:`, err);
            }
        });
        // Note: We don't await tasks here if we want absolute non-blocking,
        // but usually, for the monolith, we want internal consistency.
        await Promise.all(tasks);
        return messageId;
    }
}
exports.EventBusCore = EventBusCore;
__exportStar(require("./types"), exports);
__exportStar(require("./EventValidation"), exports);
__exportStar(require("./EventStore"), exports);
// Singleton for easy access, though DI is preferred
exports.globalEventBus = new EventBusCore();
/**
 * Legacy compatibility helper: emitEvent
 */
const emitEvent = (event) => {
    return exports.globalEventBus.emit(event);
};
exports.emitEvent = emitEvent;
/**
 * Legacy compatibility helper: emitSwarmEvent
 */
const emitSwarmEvent = async (type, context, // context is passed as any to avoid circularity with runtime
payload = {}) => {
    return exports.globalEventBus.emit({
        type,
        runId: context.runId,
        projectId: context.activeTicketId || 'none',
        chainId: context.threadId || 'none',
        actor: {
            type: 'agent',
            id: context.agent?.slug || 'unknown',
            role: context.agent?.slug || 'unknown',
        },
        payload
    });
};
exports.emitSwarmEvent = emitSwarmEvent;
/**
 * Legacy compatibility helper: emitGuardBlockEvent
 */
const emitGuardBlockEvent = async (context, payload) => {
    return exports.globalEventBus.emit({
        type: 'guard.block',
        runId: context.runId,
        projectId: context.projectId,
        chainId: context.chainId,
        actor: {
            type: 'system',
            id: 'governance-engine',
        },
        payload,
    });
};
exports.emitGuardBlockEvent = emitGuardBlockEvent;
/**
 * Utility to fetch recent events.
 * Note: This requires redis client to be injected into globalEventBus.
 */
const fetchRecentEvents = async (count = 100) => {
    // This is a placeholder for the logic in EventStore.ts or similar
    // For now, return empty as the monolith was relying on a shared global state
    // that is being reorganized.
    return [];
};
exports.fetchRecentEvents = fetchRecentEvents;
/**
 * Utility to fetch events for a run.
 */
const fetchEventsByRunId = async (input) => {
    return EventStore_1.EventStore.getEventsByRunId(input.runId);
};
exports.fetchEventsByRunId = fetchEventsByRunId;
