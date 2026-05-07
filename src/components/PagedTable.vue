<template>
  <div>
    <div class="table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th v-for="header in headers" :key="header.key">{{ header.title }}</th>
          </tr>
        </thead>
        <tbody v-if="pagedItems.length > 0">
          <tr v-for="(item, index) in pagedItems" :key="item.id || item.pn || item.key || index">
            <td v-for="header in headers" :key="header.key">
              <slot :name="header.key" :item="item" :value="item[header.key]">
                {{ displayValue(item[header.key]) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="items.length === 0" class="empty-state">{{ noDataText || $t('noData') }}</div>

    <div v-else class="d-flex align-center justify-space-between ga-2 pa-2">
      <div class="panel-meta">{{ $t('dashboard.resultCount', [items.length]) }}</div>
      <div class="d-flex align-center ga-2">
        <span class="panel-meta">{{ $t('dashboard.perPage') }}</span>
        <v-select
          v-model="perPage"
          :items="perPageOptions"
          density="compact"
          hide-details
          max-width="88"
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
</script>
