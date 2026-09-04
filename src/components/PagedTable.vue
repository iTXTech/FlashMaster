<template>
  <div class="paged-table" :class="{ 'paged-table--cards': display === 'cards' }">
    <div v-if="display === 'table'" class="table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th v-for="header in headers" :key="header.key" :class="columnClass(header)">{{ header.title }}</th>
          </tr>
        </thead>
        <tbody v-if="pagedItems.length > 0">
          <tr v-for="(item, index) in pagedItems" :key="item.key || item.id || item.pn || index">
            <td v-for="header in headers" :key="header.key" :class="columnClass(header)">
              <slot :name="header.key" :item="item" :value="item[header.key]">
                {{ displayValue(item[header.key]) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="table-card-list">
      <div v-for="(item, index) in pagedItems" :key="item.key || item.id || item.pn || index" class="table-result-card">
        <slot name="card" :item="item" :index="index" />
      </div>
    </div>

    <div v-if="items.length === 0" class="empty-state">{{ noDataText || $t('noData') }}</div>

    <div v-else class="table-footer" :class="{ 'table-footer--pagination-only': !showFooterCount }">
      <div v-if="showFooterCount" class="panel-meta">{{ $t('dashboard.resultCount', [items.length]) }}</div>
      <div class="table-pagination">
        <span class="panel-meta">{{ $t('dashboard.perPage') }}</span>
        <v-select
          v-model="perPage"
          :items="perPageOptions"
          class="per-page-select"
          density="compact"
          hide-details
          variant="plain"
          :aria-label="$t('dashboard.perPage')"
        />
        <v-btn icon="mdi-chevron-left" :aria-label="$t('dashboard.previousPage')" variant="text" :disabled="page <= 1" @click="page -= 1" />
        <span class="panel-meta">{{ $t('dashboard.page', [page, pageCount]) }}</span>
        <v-btn icon="mdi-chevron-right" :aria-label="$t('dashboard.nextPage')" variant="text" :disabled="page >= pageCount" @click="page += 1" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePagedItems } from '@/composables/usePagedItems';
import { displayValue } from '@/services/display';

const props = defineProps({
  headers: {
    type: Array,
    default: () => []
  },
  items: {
    type: Array,
    default: () => []
  },
  display: {
    type: String,
    default: 'table',
    validator: value => ['table', 'cards'].includes(value)
  },
  projectItem: {
    type: Function,
    default: item => item
  },
  noDataText: {
    type: String,
    default: ''
  },
  perPageOptions: {
    type: Array,
    default: () => [15, 30, 50, 100]
  },
  showFooterCount: {
    type: Boolean,
    default: true
  }
});

const { page, perPage, pageCount, pagedItems } = usePagedItems(
  () => props.items,
  props.perPageOptions[0] || 15,
  () => props.projectItem
);

function columnClass(header) {
  return [`col-${header.key}`, header.class].filter(Boolean);
}
</script>
