import { useEffect, useState, type ReactNode } from 'react';
import { fetchCurrentUser, hasAdminAccess, type AdminUser } from './auth';

const CLIENT_APP_URL = import.meta.env.VITE_CLIENT_URL || 'http://127.0.0.1:3000';

export function AdminGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading');
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const me = await fetchCurrentUser('');
        if (!hasAdminAccess(me.role)) {
          setState('denied');
          return;
        }
        setUser(me);
        setState('allowed');
      } catch {
        setState('denied');
      }
    };

    void run();
  }, []);

  useEffect(() => {
    if (state === 'denied') {
      const current = window.location.pathname + window.location.search;
      const to = `${CLIENT_APP_URL}/cockpit?from=${encodeURIComponent(current)}`;
      window.location.replace(to);
    }
  }, [state]);

  if (state === 'loading') {
    return <div className="panel"><h2>Authorizing…</h2><p>Checking admin access policy.</p></div>;
  }

  if (state !== 'allowed' || !user) {
    return null;
  }

  return (
    <>
      <div className="banner">Signed in as {user.email} ({user.role})</div>
      {children}
    </>
  );
}
