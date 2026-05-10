<template>
  <div class="workspace">
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
                <div v-if="vendorLogo" class="vendor-logo-wrap" :class="{ 'vendor-logo-wrap--dark': vendorLogoDark }">
                  <img :src="vendorLogo" :alt="header.vendor" :class="['vendor-logo', vendorLogoClass]" />
                </div>
                <div class="metric-value">{{ displayValue(header.vendor) }}</div>
              </div>
              <div class="result-title-panel">
                <div class="result-title">{{ displayValue(header.title) }}</div>
                <div class="result-subtitle">{{ displayValue(header.subtitle) }}</div>
                <div v-if="header.chips.length > 0" class="result-chip-row">
                  <v-chip v-for="chip in header.chips" :key="chip" size="x-small" variant="tonal">{{ chip }}</v-chip>
                </div>
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

    <v-row v-if="result" dense class="mt-3">
      <v-col v-for="block in detailBlockViews" :key="block.id" cols="12" md="6" xl="4">
        <section class="panel">
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
            <template #action="{ item }">
              <v-btn icon="mdi-content-copy" variant="text" @click="copyLine(`${item.name}: ${item.value}`)" />
            </template>
          </PagedTable>
        </section>
      </v-col>

      <v-col v-if="relations.length > 0" cols="12">
        <section class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">{{ $t('dashboard.relatedData') }}</div>
              <div class="panel-meta">{{ $t('dashboard.resultCount', [relations.length]) }}</div>
            </div>
          </div>
          <PagedTable :headers="relationHeaders" :items="relations" :per-page-options="[8, 16, 32]">
            <template #action="{ item }">
              <v-btn
                v-if="item.route"
                icon="mdi-arrow-right"
                variant="text"
                @click="router.push(item.route)"
              />
            </template>
          </PagedTable>
        </section>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import MetricGrid from '@/components/MetricGrid.vue';
import PagedTable from '@/components/PagedTable.vue';
import { copyText } from '@/services/clipboard';
import { displayValue } from '@/services/display';
import { decodePartNumber, searchPartNumber, summarizePartNumber } from '@/services/flashApi';
import {
  detailBlocks,
  partSuggestions,
  primaryMetrics,
  relationRows,
  resultHeader,
  summaryText,
  warnings
} from '@/services/fdnextResultView';
import { trackLookup } from '@/services/analytics';
import getVendorLogo, { getVendorLogoKey } from '@/services/vendorLogos';
import bus from '@/store/bus';
import store from '@/store';

const { t } = useI18n();
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
let suppressedSuggestionValue = '';
const suggestionLimit = 10;

const header = computed(() => resultHeader(result.value));
const resultPanelMeta = computed(() => {
  if (!result.value) return t('dashboard.empty');
  return result.value.status && result.value.status !== 'ok' ? header.value.status : '';
});
const vendorLogo = computed(() => getVendorLogo(header.value.vendor));
const vendorLogoKey = computed(() => getVendorLogoKey(header.value.vendor));
const vendorLogoClass = computed(() => vendorLogoKey.value ? `vendor-logo--${vendorLogoKey.value}` : '');
const vendorLogoDark = computed(() => vendorLogoKey.value === 'biwin');
const mainMetrics = computed(() => primaryMetrics(result.value));
const detailBlockViews = computed(() => detailBlocks(result.value).map(block => ({
  ...block,
  cardView: block.rows.length <= 6
})));
const relations = computed(() => relationRows(result.value));
const warningRows = computed(() => warnings(result.value));
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
const relationHeaders = computed(() => [
  { title: t('type'), key: 'kind' },
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

async function decode(syncRoute = true) {
  const pn = normalizeInput();
  if (!pn) {
    notify(t('alert.missingPartNumber'));
    return;
  }
  if (syncRoute && route.query.pn !== pn) {
    router.push({ path: '/decode', query: { pn } });
  }
  if (store.isAutoHideSoftKeyboard()) {
    input.value?.blur?.();
  }
  loading.value = true;
  try {
    const payload = await decodePartNumber(pn);
    result.value = payload;
    store.statDecodeIdInc();
    trackLookup({
      target: 'pn',
      action: 'decode',
      query: pn,
      resultCount: payload.status === 'ok' ? 1 : 0
    });
  } catch (err) {
    result.value = null;
    trackLookup({
      target: 'pn',
      action: 'decode',
      query: pn,
      success: false
    });
    notify(t('alert.fetchFailed', [err.message || err]));
  } finally {
    loading.value = false;
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
  router.push({ path: '/searchPn', query: { pn } });
}

function goSearchId() {
  const id = normalizeInput();
  if (!id) return notify(t('alert.missingFlashId'));
  router.push({ path: '/searchId', query: { id } });
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

onMounted(() => {
  if (route.query.pn) {
    partNumber.value = store.queryInputFormat(route.query.pn);
    decode(false);
  } else {
    focusInput();
  }
});

watch(() => route.query.pn, value => {
  const next = store.queryInputFormat(value);
  if (next && next !== partNumber.value) {
    partNumber.value = next;
    decode(false);
  } else if (!value) {
    partNumber.value = '';
    result.value = null;
    clearSuggestions();
    focusInput();
  }
});
</script>
