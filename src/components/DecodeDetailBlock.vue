<template>
  <section class="panel" :class="panelClasses">
    <div class="panel-header">
      <div>
        <div class="panel-title">{{ block.label }}</div>
        <div v-if="!block.cardView" class="panel-meta">{{ t('dashboard.resultCount', [rows.length]) }}</div>
      </div>
      <v-btn icon="mdi-content-copy" variant="text" @click="emit('copy-rows', rows)" />
    </div>
    <div v-if="block.cardView" class="panel-body detail-card-body">
      <MetricGrid
        class="detail-card-grid"
        :items="block.metrics"
        :fill-list-row="fillWideLists && block.wide"
        :list-preview-rows="listPreviewRows"
      />
    </div>
    <PagedTable v-else :headers="headers" :items="rows" :per-page-options="perPageOptions">
      <template #value="{ item }">
        <ExpandableListCell
          v-if="item.items?.length"
          class="table-controller-list"
          :items="item.items"
          :limit="tableListLimit"
        />
        <span v-else>{{ item.value }}</span>
      </template>
      <template #action="{ item }">
        <v-btn icon="mdi-content-copy" variant="text" @click="emit('copy-line', `${item.name}: ${item.value}`)" />
      </template>
    </PagedTable>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ExpandableListCell from '@/components/ExpandableListCell.vue';
import MetricGrid from '@/components/MetricGrid.vue';
import PagedTable from '@/components/PagedTable.vue';

const props = defineProps({
  block: {
    type: Object,
    required: true
  },
  headers: {
    type: Array,
    default: () => []
  },
  panelClass: {
    type: String,
    required: true
  },
  classPrefix: {
    type: String,
    required: true
  },
  fillWideLists: {
    type: Boolean,
    default: true
  },
  listPreviewRows: {
    type: Number,
    default: 2
  },
  tableListLimit: {
    type: Number,
    default: 4
  },
  perPageOptions: {
    type: Array,
    default: () => [8, 16, 32]
  }
});

const emit = defineEmits(['copy-rows', 'copy-line']);
const { t } = useI18n();

const rows = computed(() => props.block.rows || []);
const panelClasses = computed(() => [
  props.panelClass,
  `${props.classPrefix}--${props.block.id}`,
  {
    'detail-panel--wide': props.block.wide,
    [`${props.classPrefix}--card`]: props.block.cardView,
    [`${props.classPrefix}--compact`]: props.block.cardView && props.block.metrics.length === 1 && !props.block.wide,
    [`${props.classPrefix}--single`]: props.block.cardView && props.block.metrics.length === 1 && !props.block.wide,
    [`${props.classPrefix}--table`]: !props.block.cardView,
    [`${props.classPrefix}--balanced`]: props.block.cardView && props.block.metrics.length === 3
  }
]);
</script>
