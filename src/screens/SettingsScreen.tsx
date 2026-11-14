const buildDate = new Date(__BUILD_DATE__).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

export function SettingsScreen() {
  return (
    <main className="screen">
      <h1 className="screen-title">Réglages</h1>
      <div className="panel">
        <div className="kv"><span>Version</span><span className="muted">{__APP_VERSION__}</span></div>
        <div className="kv"><span>Déployée le</span><span className="muted">{buildDate}</span></div>
      </div>
    </main>
  );
}
