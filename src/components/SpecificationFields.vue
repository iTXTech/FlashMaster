<template>
  <dl class="spec-fields">
    <div v-for="row in displayRows" :key="row.key" class="spec-field" :class="{ 'spec-field--long': row.long, 'spec-field--mobile-long': row.mobileLong, 'spec-field--list': row.items?.length }">
      <dt :title="row.name">{{ row.label }}</dt>
      <dd>
        <ExpandableListCell v-if="row.items?.length" class="metric-expandable-list spec-controller-list" :items="row.items" fill-row :preview-rows="2" />
        <span v-else>{{ row.value }}</span>
      </dd>
    </div>
  </dl>
</template>

<script setup>
import { computed } from 'vue';
import ExpandableListCell from '@/components/ExpandableListCell.vue';
import { specificationRows } from '@/services/fdnextResultView';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  compactLabels: { type: Boolean, default: false }
});
const displayRows = computed(() => specificationRows(props.rows, { compactLabels: props.compactLabels }));
</script>
