import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, User, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export const LoginPage: FC = () => {
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, isLoading, user } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/cockpit';

  // Robust redirection: Watch for authentication state changes
  useEffect(() => {
    console.log('[LoginPage] State check:', { 
      isAuthenticated, 
      isLoading, 
      userEmail: user?.email,
      pathname: location.pathname 
    });
    
    if (isAuthenticated && !isLoading) {
      console.log('[LoginPage] Auth verified. Standard navigate to:', from);
      navigate(from, { replace: true });

      // Fallback: If after 800ms we are still on the login page, force a hard reload redirect
      const timeout = setTimeout(() => {
        if (window.location.pathname === '/login') {
          console.warn('[LoginPage] Navigation seems stuck, forcing window.location.href to:', from);
          window.location.href = from;
        }
      }, 800);
      
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, isLoading, navigate, from, location.pathname, user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      console.log('[LoginPage] Initiating secure connection...');
      await login({
        email: identifier,
        username: identifier, // Send as both to be robust against any backend version
        password,
      });
      console.log('[LoginPage] Login core function returned successfully');
      
      notify('Welcome back, Commander.', 'success');
      
      // Immediate navigation attempt
      console.log('[LoginPage] Triggering immediate navigation to:', from);
      navigate(from, { replace: true });

    } catch (err: any) {
      console.error('[LoginPage] Authentication error:', err);
      notify(err.message || 'Access Denied. Terminal is locked.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Ornaments - Unified with OKLCH tokens if available, or subtle opacity */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.03),transparent_70%)] pointer-events-none" />
      <div className="absolute -top-[20%] -left-[10%] size-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-[20%] -right-[10%] size-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none animate-pulse delay-700" />
      
      <Card className="w-full max-w-md border-border/50 bg-card/40 backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in duration-700 border-t-primary/20">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-6 inline-flex p-4 bg-primary/10 text-primary rounded-2xl border border-primary/20 shadow-[0_0_40px_rgba(var(--primary-rgb),0.15)] relative group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <ShieldCheck className="size-10 relative z-10" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tighter text-foreground uppercase italic px-2 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">System Access</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mt-4 opacity-70">
            Authentication Required: Initializing Cockpit Runtime
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-60">
                  {isEmailLogin ? 'Command Email' : 'Terminal Identifier'}
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-all duration-300">
                    {isEmailLogin ? <Mail className="size-4" /> : <User className="size-4" />}
                  </div>
                  <Input
                    type={isEmailLogin ? 'email' : 'text'}
                    placeholder={isEmailLogin ? 'commander@system.io' : 'admin_core_a1'}
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-11 h-12 bg-secondary/20 border-border/50 focus:bg-background/50 transition-all font-mono text-xs uppercase tracking-tight"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                    Security Passcode
                  </label>
                  <button
                    type="button"
                    className="text-[9px] font-black text-primary hover:text-primary/80 uppercase tracking-[0.2em] transition-all hover:scale-105"
                  >
                    Recover
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-all duration-300">
                    <Lock className="size-4" />
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 bg-secondary/20 border-border/50 focus:bg-background/50 transition-all font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setIsEmailLogin(!isEmailLogin)}
                className="text-[9px] font-black text-muted-foreground/50 hover:text-primary transition-all uppercase tracking-[0.25em] border-b border-transparent hover:border-primary/30 pb-0.5"
              >
                Switch to {isEmailLogin ? 'Username' : 'Email'}
              </button>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 group relative overflow-hidden active:scale-[0.98] transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Authorizing...
                </>
              ) : (
                <>
                  Establish Secure Connection
                  <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-8 pt-10 pb-8 border-t border-border/20 px-8">
          <div className="text-center w-full">
            <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.4em]">
              Security Protocol v4.2.0 • Encryption Active
            </p>
          </div>
          
          <div className="flex justify-center gap-8 w-full">
            {['Documentation', 'Ops Support', 'Compliance'].map((label) => (
              <button key={label} className="text-[9px] font-black text-muted-foreground/40 hover:text-foreground transition-colors uppercase tracking-widest">{label}</button>
            ))}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
