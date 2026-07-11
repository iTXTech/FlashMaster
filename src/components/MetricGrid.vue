<template>
  <div class="metric-grid" :style="gridStyle">
    <div v-for="item in normalizedItems" :key="item.label" class="metric">
      <div class="metric-label">{{ item.label }}</div>
      <div class="metric-value">
        <ExpandableListCell
          v-if="item.items.length > 0"
          class="metric-expandable-list"
          :items="item.items"
          :limit="listLimit"
          :fill-row="fillListRow"
          :min-column-width="listMinColumnWidth"
          :preview-rows="listPreviewRows"
        />
        <template v-else>{{ item.value }}</template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import ExpandableListCell from '@/components/ExpandableListCell.vue';
import { displayValue } from '@/services/display';

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  emptyValue: {
    type: String,
    default: '-'
  },
  listLimit: {
    type: Number,
    default: 4
  },
  fillListRow: {
    type: Boolean,
    default: false
  },
  listMinColumnWidth: {
    type: Number,
    default: 112
  },
  listPreviewRows: {
    type: Number,
    default: 1
  }
});

const normalizedItems = computed(() => props.items.map(item => ({
  label: item.label,
  value: displayValue(item.value, props.emptyValue),
  items: Array.isArray(item.items) ? item.items : []
})));

function wideColumnCount(count) {
  return count <= 10 ? count : Math.ceil(count / 2);
}

function balancedColumnCount(count) {
  return count <= 6 ? count : Math.ceil(count / 2);
}

const gridStyle = computed(() => ({
  '--metric-column-count': String(Math.max(1, wideColumnCount(normalizedItems.value.length))),
  '--metric-balanced-column-count': String(Math.max(1, balancedColumnCount(normalizedItems.value.length))),
  '--metric-compact-column-count': String(Math.max(1, Math.min(normalizedItems.value.length, 4)))
}));
</script>
