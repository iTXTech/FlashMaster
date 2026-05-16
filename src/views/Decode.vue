<template>
  <div class="workspace workspace--decode">
    <div class="workspace-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('dashboard.queryPanel') }}</div>
          </div>
          <v-btn icon="mdi-book-information-variant" variant="text" :disabled="!partNumber" @click="copySummary" />
        </div>
        <div class="panel-body query-stack">
          <v-combobox
            ref="input"
            v-model="partNumberInput"
            :items="suggestions"
            item-title="value"
            item-value="value"
            :return-object="false"
            :loading="loadingSuggestions"
            class="pn"
            clearable
            hide-details
            no-filter
            :label="$t('partNumberOrFlashId')"
            @update:search="searchSuggestions"
            @update:model-value="selectPartNumber"
            @keydown.enter.prevent="decode"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props" :title="item.raw.title" :subtitle="item.raw.subtitle" />
            </template>
          </v-combobox>
          <div class="action-row">
            <v-btn color="primary" prepend-icon="mdi-crosshairs-gps" @click="decode">{{ $t('query') }}</v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-magnify" @click="goSearchPn">{{ $t('search') }}</v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-flash" @click="goSearchId">{{ $t('searchId') }}</v-btn>
          </div>
          <v-progress-linear v-if="loading" indeterminate color="primary" />
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('dashboard.decodeResult') }}</div>
            <div v-if="resultPanelMeta" class="panel-meta">{{ resultPanelMeta }}</div>
          </div>
          <v-btn icon="mdi-content-copy" variant="text" :disabled="!result" @click="copyOverview" />
        </div>
        <div class="panel-body">
          <div v-if="result" class="result-stack">
            <div class="result-hero">
              <div class="metric decode-vendor-metric">
                <div class="metric-label">{{ $t('vendor') }}</div>
                <VendorLogo :vendor="header.vendor">
                  <div class="metric-value">{{ displayValue(header.vendor) }}</div>
                </VendorLogo>
              </div>
              <div class="result-title-panel">
                <div class="result-title">{{ displayValue(header.title) }}</div>
                <div class="result-subtitle">{{ displayValue(header.subtitle) }}</div>
              </div>
            </div>
            <div v-if="warningRows.length > 0" class="warning-list">
              <div v-for="item in warningRows" :key="item.code" class="warning-item">{{ item.message }}</div>
            </div>
            <MetricGrid :items="mainMetrics" />
          </div>
          <div v-else class="empty-state">{{ $t('dashboard.empty') }}</div>
        </div>
      </section>
    </div>

    <div v-if="result" class="decode-detail-grid">
      <section
        v-for="block in detailBlockViews"
        :key="block.id"
        class="panel decode-detail-panel"
        :class="{
          'detail-panel--wide': block.wide,
          'decode-detail-panel--card': block.cardView,
          'decode-detail-panel--table': !block.cardView,
          'decode-detail-panel--balanced': block.cardView && block.metrics.length === 3
        }"
      >
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ block.label }}</div>
            <div v-if="!block.cardView" class="panel-meta">{{ $t('dashboard.resultCount', [block.rows.length]) }}</div>
          </div>
          <v-btn icon="mdi-content-copy" variant="text" @click="copyRows(block.rows)" />
        </div>
        <div v-if="block.cardView" class="panel-body detail-card-body">
          <MetricGrid class="detail-card-grid" :items="block.metrics" />
        </div>
        <PagedTable v-else :headers="fieldHeaders" :items="block.rows" :per-page-options="[8, 16, 32]">
          <template #value="{ item }">
            <ExpandableListCell v-if="item.items?.length" class="table-controller-list" :items="item.items" :limit="4" />
            <span v-else>{{ item.value }}</span>
          </template>
          <template #action="{ item }">
            <v-btn icon="mdi-content-copy" variant="text" @click="copyLine(`${item.name}: ${item.value}`)" />
          </template>
        </PagedTable>
      </section>

      <section v-if="relations.length > 0" class="panel relation-panel decode-relation-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('dashboard.relatedData') }}</div>
            <div class="panel-meta">{{ $t('dashboard.resultCount', [relations.length]) }}</div>
          </div>
        </div>
        <div class="relation-card-grid">
          <button
            v-for="item in relations"
            :key="item.key"
            class="relation-card"
            :class="{ 'relation-card--action': item.route }"
            type="button"
            :disabled="!item.route"
            @click="item.route && router.push(localizedRoute(item.route))"
          >
            <span class="relation-card-copy">
              <span v-if="item.label" class="search-card-label">{{ item.label }}</span>
              <span class="relation-card-title">{{ item.target || item.value }}</span>
            </span>
          </button>
        </div>
      </section>

      <section v-if="externalLinks.length > 0" class="panel external-link-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('dashboard.externalLinks') }}</div>
            <div class="panel-meta">{{ $t('dashboard.resultCount', [externalLinks.length]) }}</div>
          </div>
        </div>
        <div class="panel-body external-link-panel-body">
          <ExternalLinks :links="externalLinks" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import MetricGrid from '@/components/MetricGrid.vue';
import PagedTable from '@/components/PagedTable.vue';
import ExpandableListCell from '@/components/ExpandableListCell.vue';
import ExternalLinks from '@/components/ExternalLinks.vue';
import VendorLogo from '@/components/VendorLogo.vue';
import { copyText } from '@/services/clipboard';
import { displayValue } from '@/services/display';
import { decodePartNumber, searchPartNumber, summarizePartNumber } from '@/services/flashApi';
import {
  detailBlocks,
  externalLinkRows,
  partSuggestions,
  primaryMetrics,
  relationRows,
  resultHeader,
  summaryText,
  warnings
} from '@/services/fdnextResultView';
import { trackPartNumberLookup } from '@/services/analytics';
import { idsSearchRoute, localizeRouteLocation, partRoute, partsSearchRoute, routeParamText } from '@/router/locations';
import bus from '@/store/bus';
import store from '@/store';

const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();
const input = ref(null);

const partNumber = ref('');
const suggestions = ref([]);
const result = ref(null);
const loading = ref(false);
const loadingSuggestions = ref(false);
let suggestionTimer;
let suggestionRequestId = 0;
let decodeRequestId = 0;
let suppressedSuggestionValue = '';
const suggestionLimit = 10;

const header = computed(() => resultHeader(result.value));
const resultPanelMeta = computed(() => {
  if (!result.value) return t('dashboard.empty');
  return result.value.status && result.value.status !== 'ok' ? header.value.status : '';
});
const mainMetrics = computed(() => primaryMetrics(result.value));
const detailBlockViews = computed(() => detailBlocks(result.value).map(block => ({
  ...block,
  wide: block.rows.some(row => row.items?.length),
  cardView: block.rows.length <= 6
})));
const relations = computed(() => relationRows(result.value));
const warningRows = computed(() => warnings(result.value));
const externalLinks = computed(() => externalLinkRows(result.value?.links, header.value.vendor));
const partNumberInput = computed({
  get: () => partNumber.value,
  set: value => {
    partNumber.value = store.queryInputFormat(normalizePartNumberValue(value));
  }
});

const fieldHeaders = computed(() => [
  { title: t('name'), key: 'name' },
  { title: t('value'), key: 'value' },
  { title: t('action'), key: 'action' }
]);

function normalizeComboValue(value) {
  if (value && typeof value === 'object') {
    return value.value || value.title || '';
  }
  return String(value || '');
}

function normalizePartNumberValue(value) {
  const text = normalizeComboValue(value).trim();
  const hit = suggestions.value.find(item => item.value === text || item.title === text);
  if (hit) return hit.value;
  const segments = text.split(/\s+\/\s+/).filter(Boolean);
  return segments.at(-1) || text;
}

function clearSuggestions() {
  suggestionRequestId += 1;
  clearTimeout(suggestionTimer);
  suggestions.value = [];
  loadingSuggestions.value = false;
}

function commitPartNumber(value) {
  const next = store.partNumberFormat(normalizePartNumberValue(value));
  suppressedSuggestionValue = next;
  partNumber.value = next;
  clearSuggestions();
  return next;
}

function normalizeInput() {
  return commitPartNumber(partNumber.value);
}

function focusInput() {
  nextTick(() => input.value?.focus?.());
}

function routePartNumber() {
  return store.queryInputFormat(routeParamText(route, 'pn'));
}

function activePartNumber() {
  return routePartNumber() || (loading.value || result.value ? store.partNumberFormat(partNumber.value) : '');
}

function localizedRoute(location) {
  return localizeRouteLocation(location, route);
}

async function decode(syncRoute = true, { recordUsage = true } = {}) {
  const requestId = ++decodeRequestId;
  const pn = normalizeInput();
  if (!pn) {
    loading.value = false;
    notify(t('alert.missingPartNumber'));
    return;
  }
  if (syncRoute && routePartNumber() !== pn) {
    router.push(partRoute(pn, route));
  }
  if (store.isAutoHideSoftKeyboard()) {
    input.value?.blur?.();
  }
  loading.value = true;
  try {
    const payload = await decodePartNumber(pn);
    if (requestId !== decodeRequestId) return;
    result.value = payload;
    if (recordUsage) {
      store.statDecodeIdInc();
      trackPartNumberLookup({
        action: 'decode',
        routeName: route.name,
        partNumber: pn,
        resultCount: payload.status === 'ok' ? 1 : 0
      });
    }
  } catch (err) {
    if (requestId !== decodeRequestId) return;
    result.value = null;
    if (recordUsage) {
      trackPartNumberLookup({
        action: 'decode',
        routeName: route.name,
        partNumber: pn,
        success: false
      });
    }
    notify(t('alert.fetchFailed', [err.message || err]));
  } finally {
    if (requestId === decodeRequestId) {
      loading.value = false;
    }
  }
}

async function selectPartNumber(value) {
  const text = normalizeComboValue(value).trim();
  const hit = suggestions.value.find(item => item.value === text || item.title === text);
  if (hit) {
    commitPartNumber(hit.value);
    await decode();
    return;
  }
}

function searchSuggestions(input) {
  clearTimeout(suggestionTimer);
  const query = store.partNumberFormat(input || '');
  if (query.length < 3) {
    clearSuggestions();
    return;
  }
  if (query === suppressedSuggestionValue || suggestions.value.some(item => item.value === query)) {
    clearSuggestions();
    return;
  }
  suppressedSuggestionValue = '';
  const requestId = ++suggestionRequestId;
  suggestionTimer = setTimeout(async () => {
    loadingSuggestions.value = true;
    try {
      const payload = await searchPartNumber(query, suggestionLimit);
      if (requestId !== suggestionRequestId) return;
      suggestions.value = partSuggestions(payload);
    } catch {
      if (requestId !== suggestionRequestId) return;
      suggestions.value = [];
    } finally {
      if (requestId === suggestionRequestId) {
        loadingSuggestions.value = false;
      }
    }
  }, 220);
}

function goSearchPn() {
  const pn = normalizeInput();
  if (!pn) return notify(t('alert.missingPartNumber'));
  router.push(partsSearchRoute(pn, route));
}

function goSearchId() {
  const id = normalizeInput();
  if (!id) return notify(t('alert.missingFlashId'));
  router.push(idsSearchRoute(id, route));
}

async function copySummary() {
  const pn = normalizeInput();
  if (!pn) return notify(t('alert.missingPartNumber'));
  loading.value = true;
  try {
    const summary = await summarizePartNumber(pn);
    await copyLine(summary, t('dashboard.copiedSummary'));
  } catch (err) {
    notify(t('alert.fetchFailed', [err.message || err]));
  } finally {
    loading.value = false;
  }
}

function copyOverview() {
  copyLine(summaryText(result.value));
}

function copyRows(rows) {
  copyLine(rows.map(item => `${item.name}: ${item.value}`).join('\n'));
}

async function copyLine(text, success = t('copySucc')) {
  try {
    await copyText(text);
    notify(success);
  } catch {
    notify(t('copyFail'));
  }
}

function notify(text) {
  bus.emit('snackbar', { timeout: 3000, show: true, text });
}

function refreshForLanguage() {
  const pn = activePartNumber();
  if (!pn) return;
  partNumber.value = pn;
  clearSuggestions();
  decode(false, { recordUsage: false });
}

onMounted(() => {
  const pn = routePartNumber();
  if (pn) {
    partNumber.value = pn;
    decode(false);
  } else {
    focusInput();
  }
});

watch(() => route.params.pn, () => {
  const next = routePartNumber();
  if (next && next !== partNumber.value) {
    partNumber.value = next;
    decode(false);
  } else if (!next) {
    decodeRequestId += 1;
    loading.value = false;
    partNumber.value = '';
    result.value = null;
    clearSuggestions();
    focusInput();
  }
});
watch(locale, refreshForLanguage);
</script>
