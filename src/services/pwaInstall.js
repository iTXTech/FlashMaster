import { computed, reactive, readonly } from 'vue';

const REMIND_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_KEY = 'pwaInstallHintShown';

// Platform detection selects help text only. Native installation always requires an event.
export function installPlatform(navigator = {}) {
  const ua = navigator.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const mobile = ios || /Android|Mobi/.test(ua);
  const embedded = /MicroMessenger|\bQQ\/|FBAN|FBAV|Instagram|DingTalk/i.test(ua);
  const chromium = /Chrome|Chromium|Edg|OPR|SamsungBrowser/.test(ua);
  return {
    mobile,
    guide: embedded ? 'external' : ios ? 'ios' : chromium ? 'native' : /Macintosh|Mac OS X/.test(ua) && /Safari/.test(ua) && !/Firefox/.test(ua) ? 'macos' : 'browser'
  };
}

export function createPwaInstall({ window: win, enabled, preferences, now = Date.now }) {
  const platform = installPlatform(win?.navigator);
  const state = reactive({
    // Manual browser-menu instructions also apply to HTTP pages on the LAN.
    enabled: Boolean(enabled && win),
    secureContext: Boolean(win?.isSecureContext),
    ...platform,
    standalone: false,
    accepted: false,
    canPrompt: false,
    busy: false,
    dialog: false,
    failed: false,
    hintsEnabled: true,
    dismissedAt: 0,
    checkedAt: now(),
    hintShown: false
  });
  let deferredPrompt;
  let started = false;
  let displayMode;

  const available = computed(() => state.enabled && !state.standalone && !state.accepted);
  const nativeOnly = computed(() => state.guide === 'native');
  const actionAvailable = computed(() => available.value && (!nativeOnly.value || state.canPrompt));
  const promotionAllowed = computed(() => actionAvailable.value && state.hintsEnabled && !state.busy &&
    (!state.dismissedAt || state.checkedAt - state.dismissedAt >= REMIND_AFTER_MS));

  function refreshPreferences() {
    state.checkedAt = now();
    state.hintsEnabled = preferences.isPwaInstallHintEnabled();
    state.dismissedAt = preferences.getPwaInstallDismissedAt();
  }

  function syncDisplayMode() {
    // This describes the current window, not whether another installed copy exists.
    state.standalone = Boolean(displayMode?.matches || win.navigator.standalone === true);
    if (state.standalone) state.dialog = false;
  }

  function capturePrompt(event) {
    if (!available.value || !state.secureContext || typeof event.prompt !== 'function') return;
    event.preventDefault();
    deferredPrompt = event;
    state.canPrompt = true;
    state.failed = false;
  }

  function claimPromotion() {
    if (!promotionAllowed.value || state.hintShown) return false;
    state.hintShown = true;
    try { win.sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* Keep session state in memory. */ }
    return true;
  }

  function dismiss() {
    state.dismissedAt = now();
    preferences.setPwaInstallDismissedAt(state.dismissedAt);
  }

  function installed() {
    state.accepted = true;
    state.dialog = false;
    state.canPrompt = false;
    deferredPrompt = undefined;
    dismiss();
  }

  function setHintsEnabled(value) {
    state.hintsEnabled = Boolean(value);
    preferences.setPwaInstallHintEnabled(state.hintsEnabled);
  }

  async function install() {
    if (!actionAvailable.value || state.busy) return;
    // Opening the guide also counts as responding to the promotion.
    dismiss();
    state.failed = false;
    if (!deferredPrompt) {
      state.dialog = true;
      return;
    }
    const event = deferredPrompt;
    deferredPrompt = undefined;
    state.canPrompt = false;
    state.busy = true;
    try {
      // Call before awaiting anything: the browser requires the user's click gesture.
      const response = await event.prompt();
      const choice = event.userChoice ? await event.userChoice : response;
      if (choice?.outcome === 'accepted') installed();
    } catch {
      if (available.value) {
        state.failed = true;
        state.dialog = !nativeOnly.value;
      }
    } finally {
      state.busy = false;
    }
  }

  function start() {
    if (started || !state.enabled) return;
    started = true;
    refreshPreferences();
    try { state.hintShown = win.sessionStorage.getItem(SESSION_KEY) === '1'; } catch { /* Optional storage. */ }
    displayMode = win.matchMedia('(display-mode: standalone)');
    syncDisplayMode();
    displayMode.addEventListener('change', syncDisplayMode);
    win.addEventListener('beforeinstallprompt', capturePrompt);
    win.addEventListener('appinstalled', installed);
    win.addEventListener('storage', refreshPreferences);
    win.addEventListener('pageshow', syncDisplayMode);
    win.addEventListener('pageshow', refreshPreferences);
    win.addEventListener('focus', refreshPreferences);
  }

  function stop() {
    if (!started) return;
    displayMode.removeEventListener('change', syncDisplayMode);
    win.removeEventListener('beforeinstallprompt', capturePrompt);
    win.removeEventListener('appinstalled', installed);
    win.removeEventListener('storage', refreshPreferences);
    win.removeEventListener('pageshow', syncDisplayMode);
    win.removeEventListener('pageshow', refreshPreferences);
    win.removeEventListener('focus', refreshPreferences);
    deferredPrompt = undefined;
    state.canPrompt = false;
    started = false;
  }

  return {
    state: readonly(state), available, nativeOnly, actionAvailable, promotionAllowed,
    start, stop, install, dismiss, claimPromotion, setHintsEnabled,
    closeGuide: () => { state.dialog = false; }
  };
}
