"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiUrl = void 0;
exports.fetchJsonSafe = fetchJsonSafe;
exports.fetchJsonStrict = fetchJsonStrict;
const config_1 = require("../api/config");
const API_FALLBACK_BASE = (import.meta.env?.VITE_API_FALLBACK_URL ||
    'http://127.0.0.1:3001').replace(/\/$/, '');
const apiUrl = (path) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const normalizedBase = config_1.API_BASE.endsWith('/') ? config_1.API_BASE.slice(0, -1) : config_1.API_BASE;
    const baseEndsWithApi = normalizedBase === '/api' || normalizedBase.endsWith('/api');
    // Prevent accidental double prefix such as "/api/api/..."
    if (baseEndsWithApi && normalizedPath.startsWith('/api/')) {
        if (normalizedBase === '/api')
            return normalizedPath;
        return `${normalizedBase}${normalizedPath.slice('/api'.length)}`;
    }
    if (baseEndsWithApi && normalizedPath === '/api') {
        if (normalizedBase === '/api')
            return '/api';
        return normalizedBase;
    }
    return `${normalizedBase}${normalizedPath}`;
};
exports.apiUrl = apiUrl;
const looksLikeHtml = (payload) => {
    const head = String(payload || '').trim().slice(0, 128).toLowerCase();
    return head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('<head') || head.startsWith('<body');
};
async function fetchJsonSafe(path, init) {
    const token = localStorage.getItem('agsys_token');
    const headers = new Headers(init?.headers || {});
    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    try {
        const res = await fetch((0, exports.apiUrl)(path), { ...init, headers });
        if (!res.ok)
            return null;
        const text = await res.text();
        if (!text.trim())
            return null;
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
async function fetchJsonStrict(path, init) {
    const token = localStorage.getItem('agsys_token');
    const headers = new Headers(init?.headers || {});
    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    const tryRequest = async (url) => {
        const res = await fetch(url, { ...init, headers });
        const raw = await res.text();
        const isHtml = looksLikeHtml(raw);
        let parsed = null;
        try {
            if (res.ok && raw) {
                parsed = JSON.parse(raw);
            }
        }
        catch {
            parsed = null;
        }
        return { parsed, isHtml, ok: res.ok, status: res.status, raw };
    };
    const primary = await tryRequest((0, exports.apiUrl)(path));
    if (primary.ok && primary.parsed)
        return primary.parsed;
    if (config_1.API_BASE === '/api') {
        const fallback = await tryRequest(`${API_FALLBACK_BASE}${path}`);
        if (fallback.ok && fallback.parsed)
            return fallback.parsed;
    }
    if (primary.isHtml) {
        throw new Error('API returned HTML instead of JSON. Ensure backend is running.');
    }
    // Extract error message from API if possible
    let apiError = '';
    try {
        const errorData = JSON.parse(primary.raw);
        apiError = errorData.error || errorData.message || '';
    }
    catch {
        // Ignore parse error
    }
    throw new Error(apiError || `Invalid API response (${primary.status}) for ${path}`);
}
