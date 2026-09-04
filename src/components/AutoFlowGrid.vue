<template>
  <div ref="grid" class="auto-flow-grid">
    <slot />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const grid = ref(null);
const observedChildren = new Set();
let frame = 0;
let measureChildren = false;

const resizeObserver = typeof ResizeObserver === 'undefined'
  ? null
  : new ResizeObserver(() => scheduleLayout());
const mutationObserver = typeof MutationObserver === 'undefined'
  ? null
  : new MutationObserver(syncObservedChildren);

function layoutItems() {
  frame = 0;
  const target = grid.value;
  if (!target) return;

  const styles = window.getComputedStyle(target);
  const rowHeight = Number.parseFloat(styles.gridAutoRows);
  const rowGap = Number.parseFloat(styles.rowGap) || 0;
  if (measureChildren !== (rowHeight > 0)) {
    measureChildren = rowHeight > 0;
    syncObservedChildren();
  }
  // Read every height before changing any span. Native single-column flow
  // needs no child measurements, including after a responsive transition.
  const measurements = [...target.children].map(item => ({
    item,
    height: rowHeight > 0 ? item.getBoundingClientRect().height : 0
  }));
  for (const { item, height } of measurements) {
    const next = rowHeight > 0
      ? `span ${Math.max(1, Math.ceil((height + rowGap) / (rowHeight + rowGap)))}`
      : '';
    if (item.style.gridRowEnd !== next) item.style.gridRowEnd = next;
  }
}

function scheduleLayout() {
  if (!frame) frame = requestAnimationFrame(layoutItems);
}

function syncObservedChildren() {
  const target = grid.value;
  if (!target || !resizeObserver) {
    scheduleLayout();
    return;
  }

  const children = new Set(measureChildren ? target.children : []);
  for (const item of observedChildren) {
    if (!children.has(item)) {
      resizeObserver.unobserve(item);
      observedChildren.delete(item);
    }
  }
  for (const item of children) {
    if (!observedChildren.has(item)) {
      resizeObserver.observe(item);
      observedChildren.add(item);
    }
  }
  scheduleLayout();
}

onMounted(() => {
  resizeObserver?.observe(grid.value);
  mutationObserver?.observe(grid.value, { childList: true });
  syncObservedChildren();
});

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
  mutationObserver?.disconnect();
  observedChildren.clear();
});
</script>
