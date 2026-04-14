import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppLoadingScreen } from '../AppLoadingScreen';

interface AuthGuardProps {
    children: React.ReactNode;
    minRole?: 'owner' | 'admin' | 'member' | 'viewer';
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, minRole }) => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <AppLoadingScreen />;
    }

    if (!isAuthenticated) {
        // Redirect to /login but save the current location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role-based access check
    if (minRole && user) {
        const roles: Record<string, number> = {
            viewer: 0,
            member: 1,
            admin: 2,
            owner: 3
        };

        if (roles[user.role] < roles[minRole]) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
                    <div className="max-w-md space-y-4">
                        <div className="inline-flex p-4 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Privileged Access Required</h1>
                        <p className="text-slate-400">Your current clearance level ({user.role}) is insufficient for this terminal. Required: {minRole}.</p>
                        <button
                            onClick={() => window.history.back()}
                            className="text-blue-500 font-bold uppercase tracking-widest text-xs hover:text-blue-400 transition-colors"
                        >
                            Return to safe zone
                        </button>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
};
