export type AdminUser = {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
};

const TOKEN_KEY = 'agsys_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function fetchCurrentUser(apiBase = ''): Promise<AdminUser> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('missing_token');
  }

  const res = await fetch(`${apiBase}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`auth_me_failed_${res.status}`);
  }

  const json = (await res.json()) as { user?: AdminUser };
  if (!json.user) {
    throw new Error('missing_user');
  }

  return json.user;
}

export function hasAdminAccess(role: AdminUser['role'] | undefined): boolean {
  return role === 'admin' || role === 'owner';
}
