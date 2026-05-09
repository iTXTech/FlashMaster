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
            <div class="panel-meta">{{ result?.id || $t('dashboard.empty') }}</div>
          </div>
          <v-btn icon="mdi-content-copy" variant="text" :disabled="!result" @click="copyOverview" />
        </div>
        <div class="panel-body">
          <div class="workspace-grid single">
            <div class="metric-grid">
              <div class="metric">
                <div class="metric-label">{{ $t('vendor') }}</div>
                <div class="vendor-logo-wrap" v-if="vendorLogo">
                  <img :src="vendorLogo" :alt="result?.vendor" class="vendor-logo" />
                </div>
                <div class="metric-value">{{ displayValue(result?.vendor) }}</div>
              </div>
              <div class="metric">
                <div class="metric-label">{{ $t('controllers') }}</div>
                <div class="metric-value">{{ controllers }}</div>
              </div>
            </div>
            <MetricGrid :items="identityMetrics" />
            <MetricGrid :items="geometryMetrics" />
          </div>
        </div>
      </section>
    </div>

    <v-row dense class="mt-3">
      <v-col cols="12" lg="4">
        <section class="panel">
          <div class="panel-header">
            <div class="panel-title">{{ $t('extraInfo') }}</div>
            <v-btn icon="mdi-content-copy" variant="text" :disabled="extraInfo.length === 0" @click="copyExtraInfo" />
          </div>
          <PagedTable :headers="extraHeaders" :items="extraInfo" :per-page-options="[8, 16, 32]">
            <template #action="{ item }">
              <v-btn icon="mdi-content-copy" variant="text" @click="copyLine(`${item.name}: ${item.value}`)" />
            </template>
          </PagedTable>
        </section>
      </v-col>

      <v-col cols="12" lg="4">
        <section class="panel">
          <div class="panel-header">
            <div class="panel-title">{{ $t('searchIdPage.pns') }}</div>
            <v-btn icon="mdi-content-copy" variant="text" :disabled="partNumbers.length === 0" @click="copyPartNumbers" />
          </div>
          <PagedTable :headers="pnHeaders" :items="partNumbers" :per-page-options="[8, 16, 32]">
            <template #action="{ item }">
              <v-btn icon="mdi-crosshairs-gps" variant="text" @click="router.push({ path: '/decode', query: { pn: item.pn } })" />
              <v-btn icon="mdi-content-copy" variant="text" @click="copyLine(item.pn)" />
            </template>
          </PagedTable>
        </section>
      </v-col>

      <v-col cols="12" lg="4">
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
import { decodeFlashId, searchFlashId, summarizeFlashId } from '@/services/flashApi';
import { trackLookup } from '@/services/analytics';
import { parsePartNumberResult } from '@/services/resultParser';
import getVendorLogo from '@/services/vendorLogos';
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

const vendorLogo = computed(() => getVendorLogo(result.value?.rawVendor));
const controllers = computed(() => displayValue(toList(result.value?.controllers).join(', ')));
const flashIdInput = computed({
  get: () => flashId.value,
  set: value => {
    flashId.value = store.queryInputFormat(normalizeComboValue(value));
  }
});

const identityMetrics = computed(() => [
  { label: t('flashId'), value: result.value?.id },
  { label: t('density'), value: formatDensity(result.value?.density, true) },
  { label: t('cellLevel'), value: result.value?.cellLevel },
  { label: t('processNode'), value: result.value?.processNode },
  { label: t('voltage'), value: result.value?.voltage }
]);

const geometryMetrics = computed(() => [
  { label: t('die'), value: result.value?.die },
  { label: t('plane'), value: result.value?.plane },
  { label: t('pageSize'), value: formatDensity(result.value?.pageSize) },
  { label: t('blockSize'), value: formatDensity(result.value?.blockSize) }
]);

const extraInfo = computed(() => objectRows(result.value?.ext));
const partNumbers = computed(() => toList(result.value?.partNumbers).map(raw => {
  return parsePartNumberResult(raw);
}));
const urls = computed(() => urlRows(result.value));

const extraHeaders = computed(() => [
  { title: t('name'), key: 'name' },
  { title: t('value'), key: 'value' },
  { title: t('action'), key: 'action' }
]);
const pnHeaders = computed(() => [
  { title: t('vendor'), key: 'vendor' },
  { title: t('partNumber'), key: 'pn' },
  { title: t('action'), key: 'action' }
]);
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
  const logo = getVendorLogo(data?.rawVendor);
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

async function copySummary() {
  const id = normalizeInput();
  if (!id) return notify(t('alert.missingFlashId'));
  loading.value = true;
  try {
    const payload = await summarizeFlashId(id);
    await copyLine(payload.data, t('dashboard.copiedSummary'));
  } catch (err) {
    notify(t('alert.fetchFailed', [err.message || err]));
  } finally {
    loading.value = false;
  }
}

function copyOverview() {
  const lines = [...identityMetrics.value, ...geometryMetrics.value]
    .map(item => `${item.label}: ${displayValue(item.value)}`);
  copyLine(lines.join('\n'));
}

function copyExtraInfo() {
  copyLine(extraInfo.value.map(item => `${item.name}: ${item.value}`).join(', '));
}

function copyPartNumbers() {
  copyLine(partNumbers.value.map(item => item.pn).join(', '));
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
