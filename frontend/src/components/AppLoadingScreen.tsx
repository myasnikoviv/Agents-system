export function AppLoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
        <div style={{ color: '#6B7280' }}>Loading Contract Registry…</div>
      </div>
    </div>
  );
}
