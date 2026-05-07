<template>
  <div class="metric-grid">
    <div v-for="item in normalizedItems" :key="item.label" class="metric">
      <div class="metric-label">{{ item.label }}</div>
      <div class="metric-value">{{ item.value }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { displayValue } from '@/services/display';

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  emptyValue: {
    type: String,
    default: '-'
  }
});

const normalizedItems = computed(() => props.items.map(item => ({
  label: item.label,
  value: displayValue(item.value, props.emptyValue)
})));
</script>
