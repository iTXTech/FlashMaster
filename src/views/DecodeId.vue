<template>
  <div class="workspace workspace--decode-id">
    <div class="workspace-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('dashboard.queryPanel') }}</div>
          </div>
          <v-btn icon="mdi-book-information-variant" variant="text" :disabled="!flashId" @click="copySummary" />
        </div>
        <div class="panel-body query-stack">
          <v-combobox
            ref="input"
            v-model="flashIdInput"
            :items="suggestions"
            item-title="value"
            item-value="value"
            :return-object="false"
            :loading="loadingSuggestions"
            class="pn"
            clearable
            hide-details
            no-filter
            :label="$t('flashId')"
            @update:search="searchSuggestions"
            @update:model-value="selectFlashId"
            @keydown.enter.prevent="decode"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props" :title="item.raw.title" :subtitle="item.raw.subtitle" />
            </template>
          </v-combobox>
          <div class="action-row">
            <v-btn color="primary" prepend-icon="mdi-memory" @click="decode">{{ $t('searchIdPage.query') }}</v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-magnify" @click="goSearchId">{{ $t('searchIdPage.search') }}</v-btn>
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
              <div class="metric decode-id-vendor-metric">
                <div class="metric-label">{{ $t('vendor') }}</div>
                <div class="decode-id-vendor-line">
                  <div v-if="vendorLogo" class="vendor-logo-wrap decode-id-logo-wrap" :class="{ 'vendor-logo-wrap--dark': vendorLogoDark }">
                    <img :src="vendorLogo" :alt="header.vendor" :class="['vendor-logo', vendorLogoClass]" />
                  </div>
                  <div class="metric-value">{{ displayValue(header.vendor) }}</div>
                </div>
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
            <MetricGrid class="decode-id-detail-grid" :items="mainMetrics" />
          </div>
          <div v-else class="empty-state">{{ $t('dashboard.empty') }}</div>
        </div>
      </section>
    </div>

    <v-row v-if="result" dense class="mt-3 decode-id-secondary-grid">
      <v-col v-if="relations.length > 0" cols="12">
        <section class="panel decode-id-pn-panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">{{ $t('searchIdPage.pns') }}</div>
              <div class="panel-meta">{{ $t('dashboard.resultCount', [relations.length]) }}</div>
            </div>
          </div>
          <div class="decode-id-pn-grid">
            <button
              v-for="item in relations"
              :key="item.key"
              class="decode-id-pn-card"
              type="button"
              @click="item.route && router.push(item.route)"
            >
              <div class="search-card-label">{{ item.kind }}</div>
              <span class="search-card-title">{{ item.target || item.value }}</span>
            </button>
          </div>
        </section>
      </v-col>

      <v-col v-for="block in detailBlockViews" :key="block.id" cols="12" :md="block.wide ? 12 : 6" :xl="block.wide ? 12 : 4">
        <section class="panel decode-id-info-panel" :class="{ 'detail-panel--wide': block.wide }">
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
import ExpandableListCell from '@/components/ExpandableListCell.vue';
import { copyText } from '@/services/clipboard';
import { displayValue } from '@/services/display';
import { decodeFlashId, searchFlashId, summarizeFlashId } from '@/services/flashApi';
import {
  detailBlocks,
  identifierSuggestions,
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

const flashId = ref('');
const suggestions = ref([]);
const result = ref(null);
const loading = ref(false);
const loadingSuggestions = ref(false);
let suggestionTimer;
let suggestionRequestId = 0;
let suppressedSuggestionValue = '';

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
  wide: block.rows.some(row => row.items?.length),
  cardView: block.rows.length <= 6
})));
const relations = computed(() => relationRows(result.value));
const warningRows = computed(() => warnings(result.value));
const flashIdInput = computed({
  get: () => flashId.value,
  set: value => {
    flashId.value = store.queryInputFormat(normalizeComboValue(value));
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

function clearSuggestions() {
  suggestionRequestId += 1;
  clearTimeout(suggestionTimer);
  suggestions.value = [];
  loadingSuggestions.value = false;
}

function commitFlashId(value) {
  const next = store.partNumberFormat(normalizeComboValue(value));
  suppressedSuggestionValue = next;
  flashId.value = next;
  clearSuggestions();
  return next;
}

function normalizeInput() {
  return commitFlashId(flashId.value);
}

function focusInput() {
  nextTick(() => input.value?.focus?.());
}

async function decode(syncRoute = true) {
  const id = normalizeInput();
  if (!id) {
    notify(t('alert.missingFlashId'));
    return;
  }
  if (syncRoute && route.query.id !== id) {
    router.push({ path: '/decodeId', query: { id } });
  }
  if (store.isAutoHideSoftKeyboard()) {
    input.value?.blur?.();
  }
  loading.value = true;
  try {
    const payload = await decodeFlashId(id);
    result.value = payload;
    store.statDecodeFidInc();
    trackLookup({
      target: 'flashid',
      action: 'decode',
      query: id,
      resultCount: payload.status === 'ok' ? 1 : 0
    });
  } catch (err) {
    result.value = null;
    trackLookup({
      target: 'flashid',
      action: 'decode',
      query: id,
      success: false
    });
    notify(t('alert.fetchFailed', [err.message || err]));
  } finally {
    loading.value = false;
  }
}

async function selectFlashId(value) {
  const text = normalizeComboValue(value).trim();
  const hit = suggestions.value.find(item => item.value === text || item.title === text);
  if (hit) {
    commitFlashId(hit.value);
    await decode();
    return;
  }
  flashId.value = store.queryInputFormat(text);
}

function searchSuggestions(inputValue) {
  clearTimeout(suggestionTimer);
  const query = store.partNumberFormat(inputValue || '');
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
      const payload = await searchFlashId(query, 10);
      if (requestId !== suggestionRequestId) return;
      suggestions.value = identifierSuggestions(payload);
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

function goSearchId() {
  const id = normalizeInput();
  if (!id) return notify(t('alert.missingFlashId'));
  router.push({ path: '/searchId', query: { id } });
}

async function copySummary() {
  const id = normalizeInput();
  if (!id) return notify(t('alert.missingFlashId'));
  loading.value = true;
  try {
    const summary = await summarizeFlashId(id);
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
  if (route.query.id) {
    flashId.value = store.queryInputFormat(route.query.id);
    decode(false);
  } else {
    focusInput();
  }
});

watch(() => route.query.id, value => {
  const next = store.queryInputFormat(value);
  if (next && next !== flashId.value) {
    flashId.value = next;
    decode(false);
  } else if (!value) {
    flashId.value = '';
    result.value = null;
    clearSuggestions();
    focusInput();
  }
});
</script>
