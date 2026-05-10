<template>
  <div class="workspace">
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
            item-title="title"
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
              <v-list-item v-bind="props" :title="item.raw.title" />
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
            <div class="panel-meta">{{ resultSummary }}</div>
          </div>
          <v-btn icon="mdi-content-copy" variant="text" :disabled="!result" @click="copyOverview" />
        </div>
        <div class="panel-body">
          <div class="workspace-grid single decode-id-result-stack">
            <div class="metric-grid decode-id-identity-grid">
              <div class="metric decode-id-vendor-metric">
                <div class="metric-label">{{ $t('vendor') }}</div>
                <div class="decode-id-vendor-line">
                  <div class="vendor-logo-wrap decode-id-logo-wrap" :class="{ 'vendor-logo-wrap--dark': vendorLogoDark }" v-if="vendorLogo">
                    <img :src="vendorLogo" :alt="result?.vendor" :class="['vendor-logo', vendorLogoClass]" />
                  </div>
                  <div class="metric-value">{{ displayValue(result?.vendor) }}</div>
                </div>
              </div>
              <div class="metric decode-id-flash-id-metric">
                <div class="metric-label">{{ $t('flashId') }}</div>
                <div class="metric-value">{{ displayValue(result?.id) }}</div>
              </div>
            </div>
            <MetricGrid class="decode-id-detail-grid" :items="detailMetrics" />
          </div>
        </div>
      </section>
    </div>

    <v-row dense class="mt-3 decode-id-secondary-grid">
      <v-col v-if="result" cols="12">
        <section class="panel decode-id-details-panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">{{ $t('controllers') }}</div>
              <div class="panel-meta">{{ controllerSummary }}</div>
            </div>
          </div>
          <div class="panel-body">
            <ExpandableListCell
              v-if="controllerList.length > 0"
              class="decode-id-controller-list search-controller-list"
              :items="controllerList"
              :limit="10"
            />
            <div v-else class="empty-state">{{ $t('noData') }}</div>
          </div>
        </section>
      </v-col>

      <v-col cols="12" :lg="urls.length > 0 ? 6 : 12">
        <section class="panel decode-id-pn-panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">{{ $t('searchIdPage.pns') }}</div>
              <div class="panel-meta">{{ $t('dashboard.resultCount', [partNumbers.length]) }}</div>
            </div>
          </div>
          <div v-if="partNumbers.length > 0" class="decode-id-pn-grid">
            <button
              v-for="item in partNumbers"
              :key="`${item.vendor}-${item.pn}`"
              class="decode-id-pn-card"
              type="button"
              @click="decodePartNumber(item.pn)"
            >
              <div class="search-card-label">{{ item.vendor || $t('unknown') }}</div>
              <span class="search-card-title">{{ item.pn }}</span>
            </button>
          </div>
          <div v-else class="empty-state">{{ $t('noData') }}</div>
        </section>
      </v-col>

      <v-col v-if="urls.length > 0" cols="12" lg="6">
        <section class="panel">
          <div class="panel-header">
            <div class="panel-title">{{ $t('urls') }}</div>
          </div>
          <PagedTable :headers="urlHeaders" :items="urls" :per-page-options="[8, 16, 32]">
            <template #description="{ item }">
              <div class="url-description">
                <img v-if="item.logo" :src="item.logo" :alt="item.description" class="url-logo" />
                <span v-else>{{ item.description }}</span>
              </div>
            </template>
            <template #action="{ item }">
              <v-btn icon="mdi-open-in-new" variant="text" @click="openUrl(item.url)" />
            </template>
          </PagedTable>
        </section>
      </v-col>

      <v-col cols="12">
        <section class="panel decode-id-info-panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">{{ $t('extraInfo') }}</div>
              <div class="panel-meta">{{ $t('dashboard.resultCount', [extraInfo.length]) }}</div>
            </div>
          </div>
          <div v-if="extraInfo.length > 0" class="decode-id-info-grid">
            <div v-for="item in extraInfo" :key="`${item.name}-${item.value}`" class="decode-id-info-card">
              <div class="search-card-label">{{ item.name }}</div>
              <div class="search-card-value decode-id-info-value">{{ item.value }}</div>
            </div>
          </div>
          <div v-else class="empty-state">{{ $t('noData') }}</div>
        </section>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import ExpandableListCell from '@/components/ExpandableListCell.vue';
import MetricGrid from '@/components/MetricGrid.vue';
import PagedTable from '@/components/PagedTable.vue';
import { copyText } from '@/services/clipboard';
import { displayValue } from '@/services/display';
import { decodeFlashId, searchFlashId, summarizeFlashId } from '@/services/flashApi';
import { trackLookup } from '@/services/analytics';
import { parsePartNumberResult } from '@/services/resultParser';
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

const vendorLogoVendor = computed(() => result.value?.rawVendor || result.value?.vendor);
const vendorLogo = computed(() => getVendorLogo(vendorLogoVendor.value));
const vendorLogoKey = computed(() => getVendorLogoKey(vendorLogoVendor.value));
const vendorLogoClass = computed(() => vendorLogoKey.value ? `vendor-logo--${vendorLogoKey.value}` : '');
const vendorLogoDark = computed(() => vendorLogoKey.value === 'biwin');
const controllerList = computed(() => toList(result.value?.controllers));
const controllerSummary = computed(() => t('dashboard.resultCount', [controllerList.value.length]));
const resultSummary = computed(() => {
  if (!result.value) return t('dashboard.empty');
  const summary = [
    formatDensity(result.value?.density, true),
    result.value?.cellLevel,
    result.value?.processNode
  ]
    .map(value => displayValue(value))
    .filter(value => value && value !== '-');
  return summary.join(' · ') || displayValue(result.value?.vendor);
});
const flashIdInput = computed({
  get: () => flashId.value,
  set: value => {
    flashId.value = store.queryInputFormat(normalizeComboValue(value));
  }
});

const identityMetrics = computed(() => [
  { label: t('density'), value: formatDensity(result.value?.density, true) },
  { label: t('cellLevel'), value: result.value?.cellLevel },
  { label: t('processNode'), value: result.value?.processNode },
  { label: t('voltage'), value: result.value?.voltage }
]);

const geometryMetrics = computed(() => [
  { label: t('die'), value: result.value?.die },
  { label: t('plane'), value: result.value?.plane },
  { label: t('pageSize'), value: formatFlashIdSize(result.value?.pageSize) },
  { label: t('blockSize'), value: formatFlashIdSize(result.value?.blockSize) }
]);
const detailMetrics = computed(() => [...identityMetrics.value, ...geometryMetrics.value]);

const extraInfo = computed(() => objectRows(result.value?.ext));
const partNumbers = computed(() => toList(result.value?.partNumbers).map(raw => {
  return parsePartNumberResult(raw);
}));
const urls = computed(() => urlRows(result.value));

const urlHeaders = computed(() => [
  { title: t('description'), key: 'description' },
  { title: t('action'), key: 'action' }
]);

function toList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function objectRows(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') return [];
  return Object.entries(value).map(([name, value]) => ({ name, value: String(value) }));
}

function urlRows(data) {
  if (!Array.isArray(data?.urls)) return [];
  const logo = getVendorLogo(data?.rawVendor || data?.vendor);
  return data.urls
    .filter(item => item?.url)
    .map(item => ({
      description: item.desc || item.hint || item.url,
      logo: item.img === 'logo' ? logo : '',
      url: item.url
    }));
}

function formatDensity(value, inBit = false) {
  return typeof value === 'number' ? store.formatNumber(value, 2, inBit, store.isBitUnit()) : value;
}

function formatFlashIdSize(value) {
  return typeof value === 'number' ? store.formatNumber(value, 1) : value;
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
    result.value = payload.data;
    store.statDecodeFidInc();
    trackLookup({
      target: 'flashid',
      action: 'decode',
      query: id,
      resultCount: payload.data ? 1 : 0
    });
  } catch (err) {
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
      const payload = await searchFlashId(query, 10);
      if (requestId !== suggestionRequestId) return;
      suggestions.value = Object.keys(payload.data || {}).map(id => ({ title: id, value: id }));
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

function decodePartNumber(pn) {
  router.push({ path: '/decode', query: { pn } });
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
  const lines = [
    { label: t('vendor'), value: result.value?.vendor },
    { label: t('flashId'), value: result.value?.id },
    ...detailMetrics.value,
    { label: t('controllers'), value: controllerList.value.join(', ') }
  ]
    .map(item => `${item.label}: ${displayValue(item.value)}`);
  copyLine(lines.join('\n'));
}

async function copyLine(text, success = t('copySucc')) {
  try {
    await copyText(text);
    notify(success);
  } catch {
    notify(t('copyFail'));
  }
}

function openUrl(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
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
