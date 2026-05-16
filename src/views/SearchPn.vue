<template>
  <div class="workspace workspace--search workspace--search-pn">
    <div class="workspace-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('search') }}</div>
          </div>
          <v-btn icon="mdi-arrow-right" variant="text" @click="search" />
        </div>
        <div class="panel-body query-stack">
          <v-text-field
            ref="input"
            v-model="partNumberInput"
            class="pn"
            clearable
            hide-details
            prepend-inner-icon="mdi-magnify"
            :label="$t('partNumber')"
            @keydown.enter.prevent="search"
          />
          <div class="action-row">
            <v-btn color="primary" prepend-icon="mdi-magnify" @click="search">{{ $t('search') }}</v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-crosshairs-gps" :disabled="!partNumber" @click="decodeCurrent">{{ $t('query') }}</v-btn>
          </div>
          <v-progress-linear v-if="loading" indeterminate color="primary" />
        </div>
      </section>

      <section class="panel search-results-panel search-pn-results-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('dashboard.searchResults') }}</div>
            <div class="panel-meta">{{ $t('dashboard.resultCount', [rows.length]) }}</div>
          </div>
        </div>
        <PagedTable :headers="headers" :items="rows" :per-page-options="[10, 15, 30, 50]" :show-footer-count="false">
          <template #card="{ item }">
            <div class="search-card-header">
              <div class="search-pn-card-content">
                <div class="search-pn-vendor-row">
                  <span class="search-pn-vendor">{{ item.vendor || $t('unknown') }}</span>
                  <span v-for="badge in item.badges" :key="badge" class="search-pn-meta-badge">{{ badge }}</span>
                </div>
                <button class="search-card-title" type="button" @click="decodePartNumber(item.pn)">
                  {{ item.pn }}
                </button>
                <div v-if="item.markingCode" class="search-card-code-line">
                  <span class="search-card-code-label">{{ $t('shortCode') }}</span>
                  <button class="search-card-code" type="button" @click="decodePartNumber(item.pn)">
                    {{ item.markingCode }}
                  </button>
                </div>
                <div v-if="item.fieldSummary" class="search-pn-meta-row">
                  <span v-if="item.fieldSummary" class="search-pn-meta-text">{{ item.fieldSummary }}</span>
                </div>
                <ExternalLinks v-if="item.links.length > 0" class="search-card-links" :links="item.links" compact />
              </div>
            </div>
          </template>
          <template #pn="{ item }">
            <ExpandableListCell :items="[item.pn]" :limit="1" clickable @select="decodePartNumber" />
          </template>
          <template #badges="{ item }">
            <div class="search-badge-row">
              <v-chip v-for="badge in item.badges" :key="badge" size="x-small" variant="tonal">{{ badge }}</v-chip>
            </div>
          </template>
          <template #summary="{ item }">
            <div class="table-kv-stack">{{ item.fieldSummary || '-' }}</div>
          </template>
        </PagedTable>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import ExpandableListCell from '@/components/ExpandableListCell.vue';
import ExternalLinks from '@/components/ExternalLinks.vue';
import PagedTable from '@/components/PagedTable.vue';
import { searchPartNumber } from '@/services/flashApi';
import { partSearchRows } from '@/services/fdnextResultView';
import { trackLookup } from '@/services/analytics';
import { partRoute, partsSearchRoute, routeParamText } from '@/router/locations';
import bus from '@/store/bus';
import store from '@/store';

const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();
const input = ref(null);

const partNumber = ref('');
const rows = ref([]);
const loading = ref(false);
let searchRequestId = 0;
const partNumberInput = computed({
  get: () => partNumber.value,
  set: value => {
    partNumber.value = store.queryInputFormat(value);
  }
});

const headers = computed(() => [
  { title: t('vendor'), key: 'vendor', class: 'search-vendor-col' },
  { title: t('partNumber'), key: 'pn', class: 'search-list-col' },
  { title: t('type'), key: 'badges', class: 'search-badge-col' },
  { title: t('value'), key: 'summary' },
  { title: t('action'), key: 'action' }
]);

function normalizeInput() {
  partNumber.value = store.partNumberFormat(partNumber.value || '');
  return partNumber.value;
}

function routeSearchQuery() {
  return store.queryInputFormat(routeParamText(route, 'query'));
}

function activeSearchQuery() {
  return routeSearchQuery() || (loading.value || rows.value.length > 0 ? store.partNumberFormat(partNumber.value) : '');
}

async function search(syncRoute = true, { recordUsage = true } = {}) {
  const requestId = ++searchRequestId;
  const pn = normalizeInput();
  if (!pn) {
    loading.value = false;
    notify(t('alert.missingPartNumber'));
    return;
  }
  if (store.isAutoHideSoftKeyboard()) {
    input.value?.blur?.();
  }
  if (syncRoute && routeSearchQuery() !== pn) {
    router.push(partsSearchRoute(pn, route));
  }
  loading.value = true;
  try {
    const payload = await searchPartNumber(pn);
    if (requestId !== searchRequestId) return;
    rows.value = partSearchRows(payload);
    if (recordUsage) {
      store.statSearchPnInc();
      trackLookup({
        target: 'pn',
        action: 'search',
        query: pn,
        resultCount: rows.value.length
      });
    }
  } catch (err) {
    if (requestId !== searchRequestId) return;
    rows.value = [];
    if (recordUsage) {
      trackLookup({
        target: 'pn',
        action: 'search',
        query: pn,
        success: false
      });
    }
    notify(t('alert.fetchFailed', [err.message || err]));
  } finally {
    if (requestId === searchRequestId) {
      loading.value = false;
    }
  }
}

function decodeCurrent() {
  const pn = normalizeInput();
  if (!pn) return notify(t('alert.missingPartNumber'));
  router.push(partRoute(pn, route));
}

function decodePartNumber(pn) {
  router.push(partRoute(pn, route));
}

function notify(text) {
  bus.emit('snackbar', { timeout: 3000, show: true, text });
}

function refreshForLanguage() {
  const query = activeSearchQuery();
  if (!query) return;
  partNumber.value = query;
  search(false, { recordUsage: false });
}

onMounted(() => {
  const query = routeSearchQuery();
  if (query) {
    partNumber.value = query;
    search(false);
  } else {
    nextTick(() => input.value?.focus?.());
  }
});

watch(() => route.params.query, () => {
  const next = routeSearchQuery();
  if (next && next !== partNumber.value) {
    partNumber.value = next;
    search(false);
  } else if (!next) {
    searchRequestId += 1;
    loading.value = false;
    partNumber.value = '';
    rows.value = [];
    nextTick(() => input.value?.focus?.());
  }
});
watch(locale, refreshForLanguage);
</script>
