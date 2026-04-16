import { type FC, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLoadingScreen from '../AppLoadingScreen';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface AuthGuardProps {
    children: ReactNode;
    minRole?: 'owner' | 'admin' | 'member' | 'viewer';
}

export const AuthGuard: FC<AuthGuardProps> = ({ children, minRole }) => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    if (isLoading) {
        console.log('[AuthGuard] Loading auth state... (blocking render)');
        return <AppLoadingScreen />;
    }

    if (!isAuthenticated) {
        console.log('[AuthGuard] REDIRECTING to /login. Reason: isAuthenticated=false, Path:', location.pathname);
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    console.log('[AuthGuard] ACCESS GRANTED for:', user?.email, 'Role:', user?.role, 'Path:', location.pathname);

    // Role-based access check
    if (minRole && user) {
        const roles: Record<string, number> = {
            viewer: 0,
            member: 1,
            admin: 2,
            owner: 3
        };

        if (!user.role || roles[user.role] === undefined) {
             console.error('[AuthGuard] CRITICAL: User has invalid or missing role:', user.role);
             // Default to fail safe? Or maybe it's a data mismatch.
        }

        if (roles[user.role] < roles[minRole]) {
             console.warn('[AuthGuard] ACCESS DENIED: Insufficient role. Required:', minRole, 'Actual:', user.role);
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center overflow-hidden font-sans relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--destructive-rgb),0.05),transparent_70%)] pointer-events-none" />
                    
                    <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500 relative z-10">
                        <div className="mx-auto size-24 bg-destructive/10 text-destructive rounded-full border border-destructive/20 shadow-[0_0_50px_rgba(var(--destructive-rgb),0.2)] flex items-center justify-center group">
                            <ShieldAlert className="size-12 transition-transform duration-500 group-hover:scale-110" />
                        </div>
                        
                        <div className="space-y-4">
                            <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Privileged Access Required</h1>
                            <div className="flex flex-col gap-4 items-center">
                                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                    Your current clearance level is insufficient for this terminal session.
                                </p>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="h-7 px-3 text-[10px] font-black uppercase tracking-widest border-border/50 bg-secondary/20">
                                        Current: {user.role}
                                    </Badge>
                                    <div className="h-px w-4 bg-border/50" />
                                    <Badge variant="destructive" className="h-7 px-3 text-[10px] font-black uppercase tracking-widest bg-destructive/10 text-destructive border-destructive/20 shadow-sm">
                                        Required: {minRole}+
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8">
                            <Button
                                variant="outline"
                                className="h-12 px-8 font-black uppercase tracking-[0.2em] text-[10px] gap-3 border-border/50 hover:bg-secondary/50 transition-all group"
                                onClick={() => window.history.back()}
                            >
                                <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
                                Return to safe zone
                            </Button>
                        </div>

                        <div className="pt-12">
                            <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.4em]">
                                Security Protocol Active • Unauthorized Access Logged
                            </p>
                        </div>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
};

export default AuthGuard;
