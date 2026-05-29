<template>
  <div ref="root" class="expandable-cell-list" :class="{ 'expandable-cell-list--expanded': expanded }">
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
    <v-btn
      v-if="hasMore"
      class="expandable-cell-toggle"
      density="compact"
      size="x-small"
      variant="text"
      :prepend-icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
      @click="expanded = !expanded"
    >
      {{ toggleLabel }}
    </v-btn>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

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
const { t } = useI18n();
const root = ref(null);
const rowCapacity = ref(0);
const expanded = ref(false);
let resizeObserver;

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
const toggleLabel = computed(() => expanded.value ? t('collapseItems') : t('showMoreItems', [hiddenCount.value]));

function selectItem(item) {
  if (props.clickable) emit('select', item);
}

function updateRowCapacity() {
  const element = root.value;
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

watch(() => [props.fillRow, props.minColumnWidth, props.previewRows], updateRowCapacity);

onMounted(() => {
  updateRowCapacity();
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(updateRowCapacity);
    if (root.value) resizeObserver.observe(root.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>
