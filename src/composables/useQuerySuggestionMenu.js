import { computed, nextTick, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { querySuggestionLayout } from '../services/querySuggestionLayout.js';

function verticalChrome(element) {
  const style = getComputedStyle(element);
  return ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']
    .reduce((height, property) => height + (parseFloat(style[property]) || 0), 0);
}

export function useQuerySuggestionMenu(combo, items) {
  const requested = ref(false);
  const minimumHeight = ref(0);
  const layout = shallowRef(null);
  let frame = 0;
  let content;
  let positionContent;

  const fieldElement = () => combo.value?.$el?.querySelector('.v-field');
  const menuOpen = computed({
    get: () => requested.value && Boolean(layout.value?.fits),
    set: value => {
      requested.value = Boolean(value && items().length);
      if (requested.value) updateLayout();
    }
  });

  function updateLayout(event) {
    // Candidate scrolling does not move the anchor. Keep it entirely local.
    if (event?.type === 'scroll' && content?.contains(event.target)) return;
    cancelAnimationFrame(frame);
    frame = 0;
    const field = fieldElement();
    if (!field) {
      layout.value = null;
      return;
    }
    const rect = field.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const left = viewport?.offsetLeft ?? 0;
    const main = field.closest('.main-surface')?.getBoundingClientRect();
    const header = document.querySelector('.v-app-bar')?.getBoundingClientRect();
    const bounds = {
      top: Math.max(top, main?.top ?? top, header?.bottom ?? top),
      left,
      right: left + (viewport?.width ?? document.documentElement.clientWidth),
      bottom: Math.min(top + (viewport?.height ?? window.innerHeight), main?.bottom ?? Infinity)
    };
    layout.value = querySuggestionLayout(rect, bounds, minimumHeight.value);
    positionContent?.();
  }

  function scheduleUpdate() {
    if (!frame && requested.value) frame = requestAnimationFrame(updateLayout);
  }

  // Keep observing while space is insufficient, so the menu can return when the
  // keyboard retracts. Closing/selecting cancels this intent and all listeners.
  watch(requested, (active, _, onCleanup) => {
    if (!active) return;
    const viewport = window.visualViewport;
    const field = fieldElement();
    let fieldWidth = field?.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const width = field?.getBoundingClientRect().width;
      // Height changes do not invalidate the measured candidate. Resetting it
      // here would repeatedly reopen a menu that has insufficient space.
      if (width !== fieldWidth) {
        minimumHeight.value = 0;
        fieldWidth = width;
      }
      updateLayout();
    });
    if (field) observer.observe(field);
    const main = field?.closest('.main-surface');
    if (main) observer.observe(main);
    window.addEventListener('resize', updateLayout, { passive: true });
    viewport?.addEventListener('resize', updateLayout, { passive: true });
    viewport?.addEventListener('scroll', updateLayout, { passive: true });
    document.addEventListener('scroll', updateLayout, { capture: true, passive: true });
    onCleanup(() => {
      observer.disconnect();
      window.removeEventListener('resize', updateLayout);
      viewport?.removeEventListener('resize', updateLayout);
      viewport?.removeEventListener('scroll', updateLayout);
      document.removeEventListener('scroll', updateLayout, true);
      cancelAnimationFrame(frame);
      frame = 0;
    });
  }, { flush: 'sync' });

  watch(items, value => {
    minimumHeight.value = 0;
    if (!value.length) menuOpen.value = false;
    else if (combo.value?.isFocused) menuOpen.value = true;
    scheduleUpdate();
  }, { flush: 'post' });

  // When the space gate has already closed the overlay, Vuetify need not emit
  // another menu=false on blur. Cancel the saved intent explicitly as well.
  watch(() => combo.value?.isFocused, focused => {
    if (!focused) menuOpen.value = false;
  });

  function locationStrategy(data, _props, styles) {
    let disposed = false;
    let revision = 0;
    let observedOption;
    const observer = new ResizeObserver(() => scheduleUpdate());
    const position = () => {
      const element = data.contentEl.value;
      const current = layout.value;
      if (!element || !current) return;
      const token = ++revision;
      const visible = current.fits && minimumHeight.value > 0;
      // Subtract the actual overlay origin, including any browser viewport pan.
      const origin = element.offsetParent?.getBoundingClientRect()
        ?? element.parentElement.getBoundingClientRect();
      styles.value = {
        top: `${current.top - origin.top}px`,
        left: `${current.left - origin.left}px`,
        width: `${current.width}px`,
        maxWidth: `${current.width}px`,
        maxHeight: `${current.maxHeight}px`,
        minHeight: '0',
        visibility: visible ? 'visible' : 'hidden',
        pointerEvents: visible ? 'auto' : 'none'
      };
      nextTick(() => {
        if (disposed || token !== revision || !menuOpen.value) return;
        const option = element.querySelector('.query-suggestion-option');
        if (!option) return;
        if (observedOption !== option) {
          if (observedOption) observer.unobserve(observedOption);
          observer.observe(option);
          observedOption = option;
        }
        let height = option.getBoundingClientRect().height;
        for (let parent = option.parentElement; parent; parent = parent.parentElement) {
          height += verticalChrome(parent);
          if (parent === element) break;
        }
        minimumHeight.value = height;
        // Re-evaluate the gate without reopening the overlay or losing focus.
        layout.value = { ...current, fits: current.fits && current.maxHeight >= height };
        if (layout.value.fits) {
          styles.value = { ...styles.value, visibility: 'visible', pointerEvents: 'auto' };
        }
      });
    };
    positionContent = position;
    styles.value = { visibility: 'hidden', pointerEvents: 'none' };
    watch(data.contentEl, element => {
      content = element;
      // Observing our own max-height would create a resize feedback loop.
      // Only the candidate needs observing once it has been measured.
      if (element) scheduleUpdate();
    }, { immediate: true, flush: 'post' });
    onScopeDispose(() => {
      disposed = true;
      observer.disconnect();
      if (positionContent === position) {
        positionContent = undefined;
        content = undefined;
      }
    });
    return { updateLocation: updateLayout };
  }

  return {
    menuOpen,
    menuProps: {
      contentClass: 'query-suggestion-menu',
      locationStrategy,
      scrollStrategy: 'none',
      transition: false
    }
  };
}
