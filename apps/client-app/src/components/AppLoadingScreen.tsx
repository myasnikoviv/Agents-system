import { type FC } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

export const AppLoadingScreen: FC = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background relative overflow-hidden font-sans">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.03),transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      
      <div className="flex flex-col items-center gap-8 relative z-10 animate-in fade-in zoom-in duration-1000">
        <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="size-20 bg-card border border-primary/20 rounded-3xl flex items-center justify-center shadow-2xl relative">
                <ShieldCheck className="size-10 text-primary animate-in spin-in-6 duration-1000" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border/50">
                <Loader2 className="size-5 text-primary animate-spin" />
            </div>
        </div>
        
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-xl font-black uppercase tracking-[0.3em] text-foreground italic bg-gradient-to-r from-foreground to-foreground/40 bg-clip-text text-transparent">
            Cockpit OS
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/60">
            Initializing System Runtime
          </p>
        </div>
        
        <div className="w-48 h-1 bg-secondary/30 rounded-full overflow-hidden border border-border/50 shadow-inner">
            <div className="h-full bg-primary animate-progress-loading" />
        </div>

        <div className="mt-8 flex flex-col items-center gap-1.5">
            <span className="text-[8px] font-mono text-muted-foreground/30 uppercase tracking-widest">
                Establishing encrypted link...
            </span>
            <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="size-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AppLoadingScreen;
