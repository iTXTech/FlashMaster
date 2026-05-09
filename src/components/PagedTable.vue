<template>
  <div class="paged-table" :class="{ 'paged-table--cards': $slots.card }">
    <div class="table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th v-for="header in headers" :key="header.key" :class="columnClass(header)">{{ header.title }}</th>
          </tr>
        </thead>
        <tbody v-if="pagedItems.length > 0">
          <tr v-for="(item, index) in pagedItems" :key="item.id || item.pn || item.key || index">
            <td v-for="header in headers" :key="header.key" :class="columnClass(header)">
              <slot :name="header.key" :item="item" :value="item[header.key]">
                {{ displayValue(item[header.key]) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="$slots.card" class="table-card-list">
      <div v-for="(item, index) in pagedItems" :key="item.id || item.pn || item.key || index" class="table-result-card">
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
          @update:model-value="page = 1"
        />
        <v-btn icon="mdi-chevron-left" variant="text" :disabled="page <= 1" @click="page -= 1" />
        <span class="panel-meta">{{ $t('dashboard.page', [page, pageCount]) }}</span>
        <v-btn icon="mdi-chevron-right" variant="text" :disabled="page >= pageCount" @click="page += 1" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { displayValue } from '@/services/display';

const props = defineProps({
  headers: {
    type: Array,
    required: true
  },
  items: {
    type: Array,
    default: () => []
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

const page = ref(1);
const perPage = ref(props.perPageOptions[0] || 15);

const pageCount = computed(() => Math.max(1, Math.ceil(props.items.length / perPage.value)));
const pagedItems = computed(() => {
  const start = (page.value - 1) * perPage.value;
  return props.items.slice(start, start + perPage.value);
});

watch(() => props.items, () => {
  page.value = 1;
});

watch(pageCount, count => {
  if (page.value > count) {
    page.value = count;
  }
});

function columnClass(header) {
  return [`col-${header.key}`, header.class].filter(Boolean);
}
</script>
