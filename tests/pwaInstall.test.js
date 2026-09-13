import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createPwaInstall, installPlatform } from '../src/services/pwaInstall.js';

const DAY = 24 * 60 * 60 * 1000;
function setup(t, options = {}) {
  let clock = 100 * DAY;
  const data = options.data || new Map();
  const session = options.session || new Map();
  const win = new EventTarget();
  const displayMode = new EventTarget();
  displayMode.matches = Boolean(options.standalone);
  Object.assign(win, {
    isSecureContext: options.secure ?? true,
    navigator: options.navigator || {},
    matchMedia: () => displayMode,
    sessionStorage: {
      getItem: key => session.get(key),
      setItem: (key, value) => session.set(key, value)
    }
  });
  const preferences = {
    isPwaInstallHintEnabled: () => data.get('hints') !== false,
    setPwaInstallHintEnabled: value => data.set('hints', value),
    getPwaInstallDismissedAt: () => data.get('dismissedAt') || 0,
    setPwaInstallDismissedAt: value => data.set('dismissedAt', value)
  };
  const install = createPwaInstall({ window: win, enabled: options.enabled ?? true, preferences, now: () => clock });
  install.start();
  t.after(install.stop);
  return {
    ...install, win, displayMode, data, session,
    advance(days) { clock += days * DAY; win.dispatchEvent(new Event('storage')); },
    prompt(outcome = 'dismissed', handler) {
      let calls = 0;
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = () => { calls++; return handler ? handler() : Promise.resolve({ outcome }); };
      win.dispatchEvent(event);
      return { event, calls: () => calls };
    }
  };
}

test('no install event remains a manual guide, including with automatic hints disabled', async t => {
  const h = setup(t);
  assert.equal(h.available.value, true);
  assert.equal(h.state.canPrompt, false);
  h.setHintsEnabled(false);
  assert.equal(h.claimPromotion(), false);
  assert.equal(h.available.value, true);
  await h.install();
  assert.equal(h.state.dialog, true);
  h.closeGuide();
  assert.equal(h.state.dialog, false);
});

test('a captured native event is consumed once, cancellation allows a fresh event', async t => {
  const h = setup(t);
  const first = h.prompt();
  assert.equal(first.event.defaultPrevented, true);
  assert.equal(h.state.canPrompt, true);
  await h.install();
  assert.equal(first.calls(), 1);
  assert.equal(h.state.canPrompt, false);
  assert.equal(h.available.value, true);
  assert.equal(h.state.dialog, false);
  assert.equal(h.promotionAllowed.value, false);
  await h.install();
  assert.equal(first.calls(), 1);
  assert.equal(h.state.dialog, true);
  const second = h.prompt('accepted');
  await h.install();
  assert.equal(second.calls(), 1);
  assert.equal(h.available.value, false);
  assert.equal(h.state.dialog, false);
});

test('prompt is invoked synchronously and concurrent clicks cannot reuse it', async t => {
  const h = setup(t);
  let resolve;
  const event = h.prompt('dismissed', () => new Promise(done => { resolve = done; }));
  const pending = h.install();
  assert.equal(event.calls(), 1);
  assert.equal(h.state.busy, true);
  await h.install();
  assert.equal(event.calls(), 1);
  resolve({ outcome: 'dismissed' });
  await pending;
  assert.equal(h.state.busy, false);
});

test('rejected prompts recover to manual instructions and appinstalled closes them', async t => {
  const h = setup(t);
  h.prompt('dismissed', () => Promise.reject(new Error('Unavailable')));
  await h.install();
  assert.equal(h.state.failed, true);
  assert.equal(h.state.dialog, true);
  assert.equal(h.state.busy, false);
  h.win.dispatchEvent(new Event('appinstalled'));
  assert.equal(h.available.value, false);
  assert.equal(h.state.dialog, false);
});

test('userChoice acceptance hides promotion even before appinstalled arrives', async t => {
  const h = setup(t);
  const { event } = h.prompt();
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  await h.install();
  assert.equal(h.available.value, false);
  assert.equal(h.claimPromotion(), false);
  assert.equal(h.state.canPrompt, false);
});

test('tips are shared across routes/reloads in a tab and respect persisted 30 day dismissal', t => {
  const h = setup(t);
  assert.equal(h.claimPromotion(), true);
  assert.equal(h.claimPromotion(), false);
  const reload = setup(t, { session: h.session, data: h.data });
  assert.equal(reload.claimPromotion(), false);
  h.dismiss();
  const nextVisit = setup(t, { data: h.data });
  assert.equal(nextVisit.claimPromotion(), false);
  nextVisit.advance(29);
  assert.equal(nextVisit.claimPromotion(), false);
  nextVisit.advance(1);
  assert.equal(nextVisit.claimPromotion(), true);
});

test('settings persist without suppressing manual entry and storage events update open tabs', t => {
  const first = setup(t);
  first.setHintsEnabled(false);
  const second = setup(t, { data: first.data });
  assert.equal(second.state.hintsEnabled, false);
  assert.equal(second.available.value, true);
  first.setHintsEnabled(true);
  second.win.dispatchEvent(new Event('storage'));
  assert.equal(second.state.hintsEnabled, true);
});

test('standalone and iOS standalone hide promotion, browser mode alone is not proof of installation', t => {
  const h = setup(t, { standalone: true });
  assert.equal(h.available.value, false);
  assert.equal(h.prompt().event.defaultPrevented, false);
  h.displayMode.matches = false;
  h.displayMode.dispatchEvent(new Event('change'));
  assert.equal(h.available.value, true);
  const ios = setup(t, { navigator: { standalone: true } });
  assert.equal(ios.claimPromotion(), false);
});

test('single-file builds never capture or offer installation, including on HTTPS', t => {
  for (const secure of [true, false]) {
    const options = { enabled: false, secure };
    const h = setup(t, options);
    assert.equal(h.available.value, false);
    assert.equal(h.claimPromotion(), false);
    assert.equal(h.prompt().event.defaultPrevented, false);
  }
});

test('LAN HTTP retains Safari manual installation and tips', async t => {
  for (const [userAgent, guide] of [['iPhone Safari', 'ios'], ['Macintosh Safari', 'macos']]) {
    const h = setup(t, { secure: false, navigator: { userAgent } });
    assert.equal(h.state.enabled, true);
    assert.equal(h.state.secureContext, false);
    assert.equal(h.state.guide, guide);
    assert.equal(h.available.value, true);
    assert.equal(h.claimPromotion(), true);
    assert.equal(h.prompt().event.defaultPrevented, false);
    assert.equal(h.state.canPrompt, false);
    h.setHintsEnabled(false);
    await h.install();
    assert.equal(h.state.dialog, true);
    assert.equal(h.available.value, true);
  }
});

test('Chromium keeps a native-only entry, enabling it only when an install event arrives', async t => {
  for (const userAgent of ['Macintosh Chrome Safari', 'Windows Chrome Edg', 'Android Chrome SamsungBrowser']) {
    const h = setup(t, { navigator: { userAgent } });
    assert.equal(h.nativeOnly.value, true);
    assert.equal(h.available.value, true);
    assert.equal(h.actionAvailable.value, false);
    assert.equal(h.claimPromotion(), false);
    await h.install();
    assert.equal(h.state.dialog, false);
    assert.equal(h.state.dismissedAt, 0);
    const event = h.prompt();
    assert.equal(h.actionAvailable.value, true);
    assert.equal(h.claimPromotion(), true);
    await h.install();
    assert.equal(event.calls(), 1);
    assert.equal(h.actionAvailable.value, false);
    assert.equal(h.state.dialog, false);
    await h.install();
    assert.equal(h.state.dialog, false);
  }
});

test('Chromium on LAN HTTP retains a disabled entry and never opens instructions', async t => {
  const h = setup(t, { secure: false, navigator: { userAgent: 'Windows Chrome Edg' } });
  assert.equal(h.available.value, true);
  assert.equal(h.actionAvailable.value, false);
  assert.equal(h.prompt().event.defaultPrevented, false);
  await h.install();
  assert.equal(h.state.dialog, false);
});

test('a failing Chromium prompt reports failure without switching to instructions', async t => {
  const h = setup(t, { navigator: { userAgent: 'Android Chrome' } });
  h.prompt('dismissed', () => Promise.reject(new Error('Unavailable')));
  await h.install();
  assert.equal(h.state.failed, true);
  assert.equal(h.state.dialog, false);
  assert.equal(h.actionAvailable.value, false);
  h.prompt('accepted');
  assert.equal(h.state.failed, false);
  await h.install();
  assert.equal(h.available.value, false);
});

test('listener lifecycle is idempotent and stop discards a stale event', t => {
  const h = setup(t);
  h.start();
  h.prompt();
  h.stop();
  assert.equal(h.state.canPrompt, false);
  assert.equal(h.prompt().event.defaultPrevented, false);
  h.start();
  assert.equal(h.prompt().event.defaultPrevented, true);
});

test('help distinguishes iPad desktop UA, Safari on Mac, Chromium, and embedded browsers', () => {
  assert.deepEqual(installPlatform({ userAgent: 'Macintosh Safari', maxTouchPoints: 5 }), { mobile: true, guide: 'ios' });
  assert.deepEqual(installPlatform({ userAgent: 'iPhone Safari' }), { mobile: true, guide: 'ios' });
  assert.deepEqual(installPlatform({ userAgent: 'Macintosh Safari', maxTouchPoints: 0 }), { mobile: false, guide: 'macos' });
  assert.equal(installPlatform({ userAgent: 'Macintosh Chrome Safari' }).guide, 'native');
  assert.equal(installPlatform({ userAgent: 'iPhone CriOS Safari' }).guide, 'ios');
  assert.equal(installPlatform({ userAgent: 'iPhone Safari MicroMessenger' }).guide, 'external');
  assert.equal(installPlatform({ userAgent: 'Android Chrome Safari' }).mobile, true);
});

test('installation preferences tolerate blocked storage and ignore corrupt timestamps', async () => {
  const source = await readFile(new URL('../src/store/index.js', import.meta.url), 'utf8');
  const storage = new Map();
  const context = vm.createContext({ localStorage: {
    getItem: key => storage.get(key),
    setItem: (key, value) => storage.set(key, value)
  } });
  const module = new vm.SourceTextModule(source, { context, initializeImportMeta: meta => { meta.env = {}; } });
  await module.link(() => {});
  await module.evaluate();
  const store = module.namespace.default;
  assert.equal(store.isPwaInstallHintEnabled(), true);
  store.setPwaInstallHintEnabled(false);
  assert.equal(store.isPwaInstallHintEnabled(), false);
  for (const value of ['bad', 'Infinity', '-1']) {
    storage.set('pwaInstallDismissedAt', value);
    assert.equal(store.getPwaInstallDismissedAt(), 0);
  }
  store.setPwaInstallDismissedAt(1234);
  assert.equal(store.getPwaInstallDismissedAt(), 1234);
  context.localStorage = { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); } };
  assert.equal(store.isPwaInstallHintEnabled(), true);
  assert.equal(store.getPwaInstallDismissedAt(), 0);
  assert.doesNotThrow(() => store.setPwaInstallHintEnabled(false));
  assert.doesNotThrow(() => store.setPwaInstallDismissedAt(1234));
});
