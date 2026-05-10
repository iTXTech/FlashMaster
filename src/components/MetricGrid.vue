<template>
  <div class="metric-grid">
    <div v-for="item in normalizedItems" :key="item.label" class="metric">
      <div class="metric-label">{{ item.label }}</div>
      <div class="metric-value">
        <ExpandableListCell
          v-if="item.items.length > 0"
          class="metric-expandable-list"
          :items="item.items"
          :limit="listLimit"
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
  }
});

const normalizedItems = computed(() => props.items.map(item => ({
  label: item.label,
  value: displayValue(item.value, props.emptyValue),
  items: Array.isArray(item.items) ? item.items : []
})));
</script>
