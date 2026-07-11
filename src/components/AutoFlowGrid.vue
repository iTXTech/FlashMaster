<template>
  <div ref="grid" class="auto-flow-grid">
    <slot />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue';

const grid = ref(null);
const observedChildren = new Set();
let frame = 0;

const resizeObserver = typeof ResizeObserver === 'undefined'
  ? null
  : new ResizeObserver(() => scheduleLayout());

function layoutItems() {
  frame = 0;
  const target = grid.value;
  if (!target || window.matchMedia('(max-width: 720px)').matches) return;

  const styles = window.getComputedStyle(target);
  const rowHeight = Number.parseFloat(styles.gridAutoRows) || 4;
  const rowGap = Number.parseFloat(styles.rowGap) || 0;

  for (const item of target.children) {
    const height = item.getBoundingClientRect().height;
    const span = Math.max(1, Math.ceil((height + rowGap) / (rowHeight + rowGap)));
    const next = `span ${span}`;
    if (item.style.gridRowEnd !== next) item.style.gridRowEnd = next;
  }
}

function scheduleLayout() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(layoutItems);
}

function syncObservedChildren() {
  const target = grid.value;
  if (!target || !resizeObserver) {
    scheduleLayout();
    return;
  }

  const children = new Set(target.children);
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
  nextTick(syncObservedChildren);
});

onUpdated(() => nextTick(syncObservedChildren));

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
  observedChildren.clear();
});
</script>
