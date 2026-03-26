export function AppLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 font-['IBM_Plex_Sans','Sora','Segoe_UI',sans-serif] text-slate-100">
      <div className="text-center">
        <div className="mb-3 text-3xl">⏳</div>
        <div className="text-sm text-slate-400">Starting Agent Cockpit…</div>
      </div>
    </div>
  );
}
