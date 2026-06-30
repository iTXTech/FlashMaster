(() => {
  if (!('serviceWorker' in navigator)) return;

  const RELOAD_THROTTLE_MS = 10 * 1000;
  const RELOAD_KEY = 'flashmaster:pwa:last-controller-reload';

  const scriptUrl = new URL(
    document.currentScript?.src || '/registerSW.js',
    window.location.href
  );
  const swUrl = new URL('sw.js', scriptUrl);
  const scope = new URL('./', scriptUrl).pathname;
  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;

  function safeGetLastReload() {
    try {
      return Number(window.sessionStorage.getItem(RELOAD_KEY) || 0);
    } catch {
      return 0;
    }
  }

  function safeSetLastReload(value) {
    try {
      window.sessionStorage.setItem(RELOAD_KEY, String(value));
    } catch {
      // Session storage can be unavailable in private or restricted contexts.
    }
  }

  function reloadForActivatedUpdate() {
    if (!hadController || refreshing) return;
    const now = Date.now();
    if (now - safeGetLastReload() < RELOAD_THROTTLE_MS) return;
    refreshing = true;
    safeSetLastReload(now);
    window.location.reload();
  }

  function activateWaitingWorker(registration) {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }

  function watchInstallingWorker(registration) {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        activateWaitingWorker(registration);
      }
    });
  }

  function checkForUpdates(registration) {
    registration.update().catch(() => {});
  }

  navigator.serviceWorker.addEventListener('controllerchange', reloadForActivatedUpdate);

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(swUrl.href, {
        scope,
        updateViaCache: 'none'
      });

      activateWaitingWorker(registration);
      registration.addEventListener('updatefound', () => watchInstallingWorker(registration));
      checkForUpdates(registration);
    } catch {
      // The app still works online/offline-capable after the next successful registration.
    }
  });
})();
