import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const HOUR = 60 * 60 * 1000;

/**
 * Offers to reload when a new version is deployed. Rendered by the tabbed layout only,
 * so it never appears, and never reloads, during a session.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Look for a new version hourly and whenever the app comes back to the foreground.
      setInterval(() => void registration.update(), HOUR);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update();
      });
    },
  });

  useEffect(() => {
    // Ask the browser not to evict our IndexedDB data (spec §8).
    void navigator.storage?.persist?.();
  }, []);

  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="status">
      <span>Nouvelle version disponible.</span>
      <button type="button" onClick={() => void updateServiceWorker(true)}>
        Recharger
      </button>
    </div>
  );
}
