<template>
  <div class="metric-region">
    <div
      class="metric-grid"
      :class="{
        'metric-grid--compact': normalizedItems.length <= 4,
        'metric-grid--single': normalizedItems.length === 1
      }"
    >
      <div
        v-for="item in normalizedItems"
        :key="item.key || item.label"
        class="metric"
        :class="{ 'metric--list': item.items.length > 1, 'metric--multiline': item.multiline }"
      >
        <div v-if="!(hideSingleLabel && normalizedItems.length === 1)" class="metric-label">{{ item.label }}</div>
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
  hideSingleLabel: {
    type: Boolean,
    default: false
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

const normalizedItems = computed(() => props.items.map(item => {
  const value = displayValue(item.value, props.emptyValue);
  return {
    key: item.key,
    label: item.label,
    value,
    items: Array.isArray(item.items) ? item.items : [],
    multiline: /[\r\n]/.test(String(value))
  };
}));
</script>

<style scoped>
.metric-region {
  min-width: 0;
  container: metric-region / inline-size;
}

.metric-region > .metric-grid {
  --metric-columns: 1;
  grid-template-columns: repeat(var(--metric-columns), minmax(0, 1fr));
  gap: 6px;
}

.metric {
  min-width: 0;
}

.metric-value {
  white-space: pre-line;
}

/* Use the same column widths for every row, including incomplete last rows. */
@container metric-region (min-width: 17rem) {
  .metric-region > .metric-grid {
    --metric-columns: 2;
  }

  .metric--multiline {
    grid-column: span 2;
  }
}

@container metric-region (min-width: 32rem) {
  .metric-region > .metric-grid:not(.metric-grid--compact) {
    --metric-columns: 3;
  }
}

@container metric-region (min-width: 42rem) {
  .metric-region > .metric-grid:not(.metric-grid--compact) {
    --metric-columns: 4;
  }
}

.metric-region > .metric-grid--single {
  --metric-columns: 1;
}

.metric-grid--single .metric--multiline {
  grid-column: auto;
}

.metric--list {
  grid-column: 1 / -1;
}
</style>
