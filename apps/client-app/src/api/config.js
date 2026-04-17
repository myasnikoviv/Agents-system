"use strict";
/**
 * Centralized API configuration.
 * Uses VITE_API_BASE environment variable if present,
 * otherwise defaults to localhost for development.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPTIMIZE_API_BASE = exports.BUILDER_API_BASE = exports.API_BASE = void 0;
const getApiBase = () => {
    const fromEnv = import.meta.env?.VITE_API_BASE;
    if (fromEnv && String(fromEnv).trim().length > 0)
        return String(fromEnv);
    // Default to relative API path in all environments.
    // Local dev resolves this through Vite proxy (/api -> localhost:3001).
    return '/api';
};
exports.API_BASE = getApiBase();
exports.BUILDER_API_BASE = `${exports.API_BASE}/builder`;
exports.OPTIMIZE_API_BASE = `${exports.API_BASE}/optimize`;
