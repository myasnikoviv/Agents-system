import { API_BASE } from '../api/config';

const API_FALLBACK_BASE = (
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_FALLBACK_URL ||
  'http://127.0.0.1:3001'
).replace(/\/$/, '');

export const apiUrl = (path: string) => {
  if (!path.startsWith('/')) return `${API_BASE}/${path}`;
  return `${API_BASE}${path}`;
};

const looksLikeHtml = (payload: string): boolean => {
  const head = String(payload || '').trim().slice(0, 128).toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('<head') || head.startsWith('<body');
};

export async function fetchJsonSafe<T = unknown>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(apiUrl(path), init);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function fetchJsonStrict<T>(path: string, init?: RequestInit): Promise<T> {
  const tryRequest = async (url: string) => {
    const res = await fetch(url, init);
    const raw = await res.text();
    const isHtml = looksLikeHtml(raw);
    let parsed: T | null = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }
    return { parsed, isHtml };
  };

  const primary = await tryRequest(apiUrl(path));
  if (primary.parsed && !primary.isHtml) return primary.parsed;

  if (API_BASE === '/api') {
    const fallback = await tryRequest(`${API_FALLBACK_BASE}${path}`);
    if (fallback.parsed && !fallback.isHtml) return fallback.parsed;
  }

  if (primary.isHtml) {
    throw new Error('API returned HTML instead of JSON. Перевір, що backend запущений на :3001.');
  }
  throw new Error(`Invalid API response for ${path}`);
}
