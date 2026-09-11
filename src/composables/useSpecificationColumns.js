import { onBeforeUnmount, onMounted, watch } from 'vue';
import { specificationColumnSpan } from '../services/specificationLayout.js';

export function useSpecificationColumns(fields, rows) {
  let context;
  let observer;
  let frame = 0;
  let observedWidth;

  function textWidth(element) {
    const style = getComputedStyle(element);
    context.font = style.font;
    context.letterSpacing = style.letterSpacing;
    context.wordSpacing = style.wordSpacing;
    return Math.max(...element.textContent.split('\n').map(line => context.measureText(line).width));
  }

  function updateColumns() {
    frame = 0;
    const grid = fields.value;
    if (!grid || !context) return;
    const style = getComputedStyle(grid);
    const tracks = style.gridTemplateColumns.split(' ').map(parseFloat);
    const gap = parseFloat(style.columnGap) || 0;
    // Read all measurements before writing spans to avoid repeated layouts.
    const spans = [...grid.children].map(field => {
      if (field.classList.contains('spec-field--list')) return null;
      const label = field.querySelector('dt');
      const value = field.querySelector('dd');
      const fieldStyle = getComputedStyle(field);
      const stacked = fieldStyle.gridTemplateColumns.split(' ').length === 1;
      const requiredWidth = stacked
        ? Math.max(textWidth(label), textWidth(value))
        : label.getBoundingClientRect().width + (parseFloat(fieldStyle.columnGap) || 0) + textWidth(value);
      return specificationColumnSpan(requiredWidth, tracks[0], gap, tracks.length);
    });
    [...grid.children].forEach((field, index) => {
      if (spans[index] !== null) field.style.setProperty('--spec-field-span', spans[index]);
    });
  }

  function scheduleUpdate() {
    if (fields.value && !frame) frame = requestAnimationFrame(updateColumns);
  }

  watch(rows, scheduleUpdate, { flush: 'post' });
  onMounted(() => {
    context = document.createElement('canvas').getContext('2d');
    observer = new ResizeObserver(([entry]) => {
      // Our own span changes affect height, not the space available per column.
      if (entry.contentRect.width === observedWidth) return;
      observedWidth = entry.contentRect.width;
      scheduleUpdate();
    });
    observer.observe(fields.value);
    document.fonts?.addEventListener('loadingdone', scheduleUpdate);
    updateColumns();
  });
  onBeforeUnmount(() => {
    observer?.disconnect();
    document.fonts?.removeEventListener('loadingdone', scheduleUpdate);
    cancelAnimationFrame(frame);
  });
}
