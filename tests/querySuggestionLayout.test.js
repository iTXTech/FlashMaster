import assert from 'node:assert/strict';
import { test } from 'node:test';
import { querySuggestionLayout } from '../src/services/querySuggestionLayout.js';
import { effectScope, nextTick, shallowRef } from 'vue';
import { useQuerySuggestionMenu } from '../src/composables/useQuerySuggestionMenu.js';

const field = { top: 170, bottom: 210, left: 16, width: 358 };
const viewport = { top: 0, bottom: 844, left: 0, right: 390 };
const candidateHeight = 82; // Complete two-line candidate plus menu chrome.

test('anchors below the whole field with a 2px gap and a scrollable height cap', () => {
  const layout = querySuggestionLayout(field, viewport, candidateHeight);
  assert.equal(layout.top, 212);
  assert.equal(layout.left, 16);
  assert.equal(layout.width, 358);
  assert.equal(layout.maxHeight, 310);
  assert.equal(layout.fits, true);
});

test('shows exactly one complete candidate, but hides with even slightly less space', () => {
  for (const remaining of [81.9, 82, 82.1]) {
    const layout = querySuggestionLayout(field, { ...viewport, bottom: 212 + remaining }, candidateHeight);
    assert.equal(layout.fits, remaining >= candidateHeight);
    assert.equal(layout.top, 212);
    assert.ok(layout.top + layout.maxHeight <= 212 + remaining);
  }
});

test('never flips upward even when all available space is above the field', () => {
  const lowField = { ...field, top: 350, bottom: 390 };
  const layout = querySuggestionLayout(lowField, { ...viewport, bottom: 400 }, candidateHeight);
  assert.equal(layout.top, 392);
  assert.equal(layout.maxHeight, 8);
  assert.equal(layout.fits, false);
});

test('accounts for panned visual viewport bounds and horizontal clipping', () => {
  const layout = querySuggestionLayout(field, {
    top: 100, bottom: 394, left: 20, right: 380
  }, candidateHeight);
  assert.equal(layout.top, 212);
  assert.equal(layout.maxHeight, 182);
  assert.equal(layout.left, 20);
  assert.equal(layout.fits, true);
});

test('hides when the field is obscured or no usable viewport remains', () => {
  for (const bounds of [
    { ...viewport, top: 180 },
    { ...viewport, bottom: 200 },
    { ...viewport, bottom: 212 },
    { ...viewport, right: 0 }
  ]) {
    assert.equal(querySuggestionLayout(field, bounds, candidateHeight).fits, false);
  }
});

test('uses measured row height rather than assuming all candidates have the same height', () => {
  const smallViewport = { ...viewport, bottom: 302 };
  assert.equal(querySuggestionLayout(field, smallViewport, 82).fits, true);
  assert.equal(querySuggestionLayout(field, smallViewport, 106).fits, false);
});

test('continuous height changes preserve visibility and never reset the one-row gate', async () => {
  const visualViewport = Object.assign(new EventTarget(), {
    offsetTop: 0, offsetLeft: 0, width: 390, height: 844
  });
  const main = { getBoundingClientRect: () => ({ top: 0, bottom: visualViewport.height }) };
  const fieldNode = { getBoundingClientRect: () => field, closest: () => main };
  const origin = { getBoundingClientRect: () => ({ top: 0, left: 0 }) };
  const content = {
    offsetParent: origin,
    chrome: { borderTopWidth: '1px', borderBottomWidth: '1px' },
    contains: () => false,
    querySelector: () => option
  };
  const list = { parentElement: content, chrome: { paddingTop: '8px', paddingBottom: '8px' } };
  const option = { parentElement: list, getBoundingClientRect: () => ({ height: 48 }) };
  const observers = [];
  const frames = new Map();
  let frameId = 0;
  const globals = {
    window: Object.assign(new EventTarget(), { visualViewport }),
    document: Object.assign(new EventTarget(), { querySelector: () => null }),
    getComputedStyle: element => element.chrome || {},
    ResizeObserver: class {
      targets = new Set();
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe(target) { this.targets.add(target); }
      unobserve(target) { this.targets.delete(target); }
      disconnect() { this.targets.clear(); }
    },
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id)
  };
  const saved = Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  const scope = effectScope();
  const overlayScope = effectScope();
  const flush = async () => {
    for (let i = 0; i < 3; i += 1) {
      await nextTick();
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback());
    }
    await nextTick();
  };
  try {
    for (const [key, value] of Object.entries(globals)) {
      Object.defineProperty(globalThis, key, { configurable: true, value });
    }
    const combo = shallowRef({ isFocused: true, $el: { querySelector: () => fieldNode } });
    const menu = scope.run(() => useQuerySuggestionMenu(combo, () => [{ value: 'NE1' }]));
    const styles = shallowRef({});
    menu.menuOpen.value = true;
    overlayScope.run(() => menu.menuProps.locationStrategy({ contentEl: shallowRef(content) }, {}, styles));
    await flush();
    assert.equal(styles.value.visibility, 'visible');

    for (const height of [700, 510, 350, 278, 277, 260, 277, 278, 350, 510]) {
      visualViewport.height = height;
      const expected = height >= 278;
      const check = () => {
        assert.equal(menu.menuOpen.value, expected, `open at ${height}px`);
        assert.equal(styles.value.visibility, expected ? 'visible' : 'hidden', `visibility at ${height}px`);
      };
      // Window, visual viewport and container events may all arrive in one
      // frame. None may temporarily hide a fitting menu or reopen a short one.
      globals.window.dispatchEvent(new Event('resize'));
      check();
      visualViewport.dispatchEvent(new Event('resize'));
      check();
      observers.filter(observer => observer.targets.has(main)).forEach(observer => observer.callback());
      check();
      await flush();
      check();
    }

    visualViewport.height = 260;
    visualViewport.dispatchEvent(new Event('resize'));
    combo.value = { ...combo.value, isFocused: false };
    await flush();
    visualViewport.height = 510;
    visualViewport.dispatchEvent(new Event('resize'));
    await flush();
    assert.equal(menu.menuOpen.value, false, 'blur cancels reopening after space returns');
  } finally {
    overlayScope.stop();
    scope.stop();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
