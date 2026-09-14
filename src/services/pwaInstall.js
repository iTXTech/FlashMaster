import { computed, reactive, readonly } from 'vue';

const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

// Platform detection selects help and mobile promotion. Native installation requires an event.
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
    promotionVisible: false
  });
  let deferredPrompt;
  let started = false;
  let displayMode;
  // Freeze eligibility to this visit; expiry in an open tab cannot show a tip.
  const visitStartedAt = now();
  let promotionChecked = false;
  let cancelPromotion;

  const available = computed(() => state.enabled && !state.standalone && !state.accepted);
  const nativeOnly = computed(() => state.guide === 'native');
  const actionAvailable = computed(() => available.value && (!nativeOnly.value || state.canPrompt));
  const entryVisible = computed(() => available.value && state.hintsEnabled && (actionAvailable.value || state.busy));
  const promotionAllowed = computed(() => state.mobile && actionAvailable.value && state.hintsEnabled && !state.busy &&
    (!state.dismissedAt || visitStartedAt - state.dismissedAt >= REMIND_AFTER_MS));

  function refreshPreferences() {
    state.hintsEnabled = preferences.isPwaInstallHintEnabled();
    state.dismissedAt = preferences.getPwaInstallDismissedAt();
    if (!promotionAllowed.value) state.promotionVisible = false;
  }

  function syncDisplayMode() {
    // This describes the current window, not whether another installed copy exists.
    state.standalone = Boolean(displayMode?.matches || win.navigator.standalone === true);
    if (state.standalone) {
      state.dialog = false;
      state.promotionVisible = false;
    }
  }

  function capturePrompt(event) {
    if (!available.value || !state.secureContext || typeof event.prompt !== 'function') return;
    event.preventDefault();
    deferredPrompt = event;
    state.canPrompt = true;
    state.failed = false;
  }

  function claimPromotion() {
    if (promotionChecked) return false;
    promotionChecked = true;
    if (!promotionAllowed.value) return false;
    state.promotionVisible = true;
    return true;
  }

  function schedulePromotion() {
    if (!state.mobile || !available.value || promotionChecked || cancelPromotion) return;
    const doc = win.document;
    const editing = element => element?.matches('input, textarea, [contenteditable="true"]');
    const cancelOnInput = event => {
      if (editing(event.target)) {
        promotionChecked = true;
        cancelPromotion();
      }
    };
    const timer = win.setTimeout(() => {
      cancelPromotion();
      const viewport = win.visualViewport;
      if (doc.hidden || editing(doc.activeElement) ||
        doc.querySelector('.v-overlay--active, .v-navigation-drawer--temporary.v-navigation-drawer--active') ||
        (viewport && viewport.height * viewport.scale < win.innerHeight - 120)) {
        promotionChecked = true;
        return;
      }
      claimPromotion();
    }, 3000);
    cancelPromotion = () => {
      win.clearTimeout(timer);
      doc.removeEventListener('input', cancelOnInput);
      doc.removeEventListener('focusin', cancelOnInput);
    };
    doc.addEventListener('input', cancelOnInput);
    doc.addEventListener('focusin', cancelOnInput);
    return cancelPromotion;
  }

  function dismiss() {
    state.promotionVisible = false;
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
    if (!state.hintsEnabled) state.promotionVisible = false;
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
      else dismiss();
    } catch {
      dismiss();
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
    cancelPromotion?.();
    state.promotionVisible = false;
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
    state: readonly(state), available, nativeOnly, actionAvailable, entryVisible, promotionAllowed,
    start, stop, install, dismiss, claimPromotion, schedulePromotion, setHintsEnabled,
    closeGuide: () => { state.dialog = false; dismiss(); }
  };
}
