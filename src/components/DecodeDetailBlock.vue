<template>
  <section class="panel detail-block" :class="panelClasses">
    <div class="detail-block-content">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">{{ block.label }}</h2>
          <div v-if="!block.cardView" class="panel-meta">{{ t('dashboard.resultCount', [rows.length]) }}</div>
        </div>
        <v-btn icon="mdi-content-copy" :aria-label="t('dashboard.copySection', [block.label])" variant="text" @click="emit('copy-rows', rows)" />
      </div>
      <div v-if="block.cardView" class="panel-body detail-card-body">
        <MetricGrid
          class="detail-card-grid"
          :items="block.metrics"
          :hide-single-label="block.metrics.length === 1 && block.metrics[0].label === block.label"
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
          <v-btn icon="mdi-content-copy" :aria-label="t('dashboard.copySection', [item.name])" variant="text" @click="emit('copy-line', `${item.name}: ${item.value}`)" />
        </template>
      </PagedTable>
    </div>
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
    'detail-block--brief': props.block.cardView && props.block.metrics.length === 1
      && !props.block.wide && !props.block.metrics[0].items?.length
      && String(props.block.metrics[0].value ?? '').length <= 24,
    [`${props.classPrefix}--card`]: props.block.cardView,
    [`${props.classPrefix}--table`]: !props.block.cardView
  }
]);
</script>
