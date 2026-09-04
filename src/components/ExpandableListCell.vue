<template>
  <div
    class="expandable-cell-list"
    :class="{
      'expandable-cell-list--expanded': expanded,
      'expandable-cell-list--large': hasLongList
    }"
  >
    <div ref="itemsRoot" class="expandable-cell-items">
      <component
        :is="clickable ? 'button' : 'div'"
        v-for="item in visibleItems"
        :key="item"
        class="expandable-cell-item"
        :class="{ 'expandable-cell-item--button': clickable }"
        type="button"
        @click="selectItem(item)"
      >
        <span>{{ item }}</span>
      </component>
    </div>
    <ExpandCollapseButton
      v-if="hasMore"
      :expanded="expanded"
      :hidden-count="hiddenCount"
      @toggle="expanded = !expanded"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ExpandCollapseButton from '@/components/ExpandCollapseButton.vue';

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  limit: {
    type: Number,
    default: 2
  },
  fillRow: {
    type: Boolean,
    default: false
  },
  minColumnWidth: {
    type: Number,
    default: 112
  },
  previewRows: {
    type: Number,
    default: 1
  },
  clickable: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['select']);
const itemsRoot = ref(null);
const rowCapacity = ref(0);
const expanded = ref(false);
let resizeObserver;
let frame = 0;

const normalizedItems = computed(() => props.items.map(item => String(item || '').trim()).filter(Boolean));
const collapsedLimit = computed(() => {
  if (!props.fillRow) return props.limit;
  const capacity = rowCapacity.value || props.limit;
  const rows = Math.max(1, Math.floor(props.previewRows));
  return capacity * rows;
});
const visibleItems = computed(() => expanded.value ? normalizedItems.value : normalizedItems.value.slice(0, collapsedLimit.value));
const hiddenCount = computed(() => Math.max(0, normalizedItems.value.length - collapsedLimit.value));
const hasMore = computed(() => normalizedItems.value.length > collapsedLimit.value);
const hasLongList = computed(() => normalizedItems.value.length > 16);

function selectItem(item) {
  if (props.clickable) emit('select', item);
}

function updateRowCapacity() {
  const element = itemsRoot.value;
  if (!element || !props.fillRow) {
    rowCapacity.value = 0;
    return;
  }
  const style = getComputedStyle(element);
  const columnGap = Number.parseFloat(style.columnGap || style.gap || '0') || 0;
  const minWidth = Math.max(1, props.minColumnWidth);
  rowCapacity.value = Math.max(1, Math.floor((element.clientWidth + columnGap) / (minWidth + columnGap)));
}

watch(normalizedItems, () => {
  expanded.value = false;
});

function scheduleRowCapacity() {
  if (!frame) frame = requestAnimationFrame(() => {
    frame = 0;
    updateRowCapacity();
  });
}

function observeRowCapacity() {
  resizeObserver?.disconnect();
  if (props.fillRow && itemsRoot.value) resizeObserver?.observe(itemsRoot.value);
  scheduleRowCapacity();
}

watch(() => [props.fillRow, props.minColumnWidth, props.previewRows], observeRowCapacity);

onMounted(() => {
  updateRowCapacity();
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(scheduleRowCapacity);
    observeRowCapacity();
  }
});

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
});
</script>
