import { API_BASE } from '../api/config';

const API_FALLBACK_BASE = (
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_FALLBACK_URL ||
  'http://127.0.0.1:3001'
).replace(/\/$/, '');

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const baseEndsWithApi = normalizedBase === '/api' || normalizedBase.endsWith('/api');

  // Prevent accidental double prefix such as "/api/api/..."
  if (baseEndsWithApi && normalizedPath.startsWith('/api/')) {
    if (normalizedBase === '/api') return normalizedPath;
    return `${normalizedBase}${normalizedPath.slice('/api'.length)}`;
  }

  if (baseEndsWithApi && normalizedPath === '/api') {
    if (normalizedBase === '/api') return '/api';
    return normalizedBase;
  }

  return `${normalizedBase}${normalizedPath}`;
};

const looksLikeHtml = (payload: string): boolean => {
  const head = String(payload || '').trim().slice(0, 128).toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('<head') || head.startsWith('<body');
};

export async function fetchJsonSafe<T = unknown>(path: string, init?: RequestInit): Promise<T | null> {
  const token = localStorage.getItem('agsys_token');
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(apiUrl(path), { ...init, headers });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function fetchJsonStrict<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('agsys_token');
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const tryRequest = async (url: string) => {
    const res = await fetch(url, { ...init, headers });
    const raw = await res.text();
    const isHtml = looksLikeHtml(raw);
    let parsed: T | null = null;
    try {
      if (res.ok && raw) {
        parsed = JSON.parse(raw) as T;
      }
    } catch {
      parsed = null;
    }
    return { parsed, isHtml, ok: res.ok, status: res.status, raw };
  };

  const primary = await tryRequest(apiUrl(path));
  if (primary.ok && primary.parsed) return primary.parsed;

  if (API_BASE === '/api') {
    const fallback = await tryRequest(`${API_FALLBACK_BASE}${path}`);
    if (fallback.ok && fallback.parsed) return fallback.parsed;
  }

  if (primary.isHtml) {
    throw new Error('API returned HTML instead of JSON. Ensure backend is running.');
  }

  // Extract error message from API if possible
  let apiError = '';
  try {
    const errorData = JSON.parse(primary.raw);
    apiError = errorData.error || errorData.message || '';
  } catch {
    // Ignore parse error
  }

  throw new Error(apiError || `Invalid API response (${primary.status}) for ${path}`);
}
