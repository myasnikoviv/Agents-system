import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchJsonStrict, fetchJsonSafe } from '../lib/http';

export interface User {
    id: string;
    username: string;
    email: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
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

    const login = async (credentials: { username?: string; email?: string; password?: string }) => {
        setIsLoading(true);
        try {
            const data = await fetchJsonStrict<{ user: User; token: string }>('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            
            localStorage.setItem('agsys_token', data.token);
            setUser(data.user);
            setToken(data.token);
        } catch (err) {
            console.error('Login failed:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await fetchJsonSafe('/api/auth/logout', { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } finally {
            localStorage.removeItem('agsys_token');
            setUser(null);
            setToken(null);
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            token, 
            isLoading, 
            login, 
            logout, 
            isAuthenticated: !!user 
        }}>
            {children}
        </AuthContext.Provider>
    );
};
