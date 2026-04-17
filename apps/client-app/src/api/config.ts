/**
 * Centralized API configuration.
 * Uses VITE_API_BASE environment variable if present,
 * otherwise defaults to localhost for development.
 */

const getApiBase = () => {
    const fromEnv = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE;
    if (fromEnv && String(fromEnv).trim().length > 0) return String(fromEnv);
    // Default to relative API path in all environments.
    // Local dev resolves this through Vite proxy (/api -> localhost:3001).
    return '/api';
};

export const API_BASE = getApiBase();
export const BUILDER_API_BASE = `${API_BASE}/builder`;
export const OPTIMIZE_API_BASE = `${API_BASE}/optimize`;
