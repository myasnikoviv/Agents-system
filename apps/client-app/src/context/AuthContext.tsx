import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchJsonStrict, fetchJsonSafe } from '../lib/http';

export interface User {
    id: string;
    username: string;
    email: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    tenantId: string;
    workspaceId: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (credentials: { username?: string; email?: string; password?: string }) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('agsys_token'));
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        setIsLoading(true);
        const storedToken = localStorage.getItem('agsys_token');
        
        if (!storedToken) {
            setIsLoading(false);
            return;
        }

        try {
            const data = await fetchJsonStrict<{ user: User }>('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${storedToken}` }
            });
            setUser(data.user);
            setToken(storedToken);
        } catch (err) {
            console.error('Auth verification failed:', err);
            localStorage.removeItem('agsys_token');
            setUser(null);
            setToken(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = useCallback(async (credentials: { username?: string; email?: string; password?: string }) => {
        setIsLoading(true);
        try {
            console.log('[AuthContext] Attempting login for:', credentials.email || credentials.username);
            const data = await fetchJsonStrict<{ user: User; token: string }>('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            
            if (!data.user || !data.token) {
                console.error('[AuthContext] Invalid login response - missing user or token:', data);
                throw new Error('Server returned an invalid session packet.');
            }

            console.log('[AuthContext] Valid login packet received for:', data.user.email);
            localStorage.setItem('agsys_token', data.token);
            setUser(data.user);
            setToken(data.token);
            console.log('[AuthContext] State synchronized with backend session');
        } catch (err) {
            console.error('[AuthContext] Login API call failed:', err);
            throw err;
        } finally {
            setIsLoading(false);
            console.log('[AuthContext] Login process finished, isLoading=false');
        }
    }, []);

    const logout = useCallback(async () => {
        console.log('[AuthContext] Logging out...');
        try {
            await fetchJsonSafe('/api/auth/logout', { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } finally {
            localStorage.removeItem('agsys_token');
            setUser(null);
            setToken(null);
            console.log('[AuthContext] Logout complete, state cleared');
        }
    }, [token]);

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ 
            user, 
            token, 
            isLoading, 
            login, 
            logout, 
            isAuthenticated 
        }}>
            {children}
        </AuthContext.Provider>
    );
};
