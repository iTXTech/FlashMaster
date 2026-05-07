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
            v-model="partNumber"
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
            <div class="panel-meta">{{ result?.partNumber || $t('dashboard.empty') }}</div>
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
            <MetricGrid :items="electricalMetrics" />
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
            <div class="panel-title">{{ $t('flashIds') }}</div>
            <v-btn icon="mdi-content-copy" variant="text" :disabled="flashIds.length === 0" @click="copyFlashIds" />
          </div>
          <PagedTable :headers="flashIdHeaders" :items="flashIds" :per-page-options="[8, 16, 32]">
            <template #action="{ item }">
              <v-btn icon="mdi-magnify" variant="text" @click="router.push({ path: '/decodeId', query: { id: item.id } })" />
              <v-btn icon="mdi-content-copy" variant="text" @click="copyLine(item.id)" />
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
import { EMPTY_VALUE, displayValue } from '@/services/display';
import { decodePartNumber, searchPartNumber, summarizePartNumber } from '@/services/flashApi';
import { parsePartNumberSuggestion } from '@/services/resultParser';
import getVendorLogo from '@/services/vendorLogos';
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

const vendorLogo = computed(() => getVendorLogo(result.value?.rawVendor));
const controllers = computed(() => displayValue(toList(result.value?.controller).join(', ')));

const identityMetrics = computed(() => [
  { label: t('partNumber'), value: result.value?.partNumber },
  { label: t('type'), value: result.value?.type },
  { label: t('density'), value: formatDensity(result.value?.rawDensity, true) },
  { label: t('deviceWidth'), value: result.value?.deviceWidth },
  { label: t('cellLevel'), value: result.value?.cellLevel },
  { label: t('processNode'), value: result.value?.processNode },
  { label: t('generation'), value: result.value?.generation },
  { label: t('comment'), value: result.value?.comment }
]);

const geometryMetrics = computed(() => {
  const classification = result.value?.classification || {};
  return [
    { label: t('ce'), value: classification.ce },
    { label: t('ch'), value: classification.ch === -2 ? 2 : classification.ch },
    { label: t('die'), value: classification.die },
    { label: t('rb'), value: classification.rb }
  ];
});

const electricalMetrics = computed(() => {
  const interfaceValue = result.value?.interface || {};
  return [
    { label: t('voltage'), value: result.value?.voltage },
    { label: t('package'), value: result.value?.package },
    { label: t('sync'), value: formatBool('toggle' in interfaceValue ? interfaceValue.toggle : interfaceValue.sync) },
    { label: t('async'), value: formatBool('toggle' in interfaceValue ? true : interfaceValue.async) }
  ];
});

const extraInfo = computed(() => objectRows(result.value?.extraInfo));
const flashIds = computed(() => toList(result.value?.flashId).map(id => ({ id })));
const urls = computed(() => urlRows(result.value));

const extraHeaders = computed(() => [
  { title: t('name'), key: 'name' },
  { title: t('value'), key: 'value' },
  { title: t('action'), key: 'action' }
]);
const flashIdHeaders = computed(() => [
  { title: t('flashId'), key: 'id' },
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

function formatBool(value) {
  if (displayValue(value) === EMPTY_VALUE) return EMPTY_VALUE;
  return value === true || value === '1' || value === 'true' ? t('yes') : value === false || value === '0' || value === 'false' ? t('no') : value;
}

function formatDensity(value, inBit = false) {
  return typeof value === 'number' ? store.formatNumber(value, 2, inBit, store.isBitUnit()) : value;
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
    result.value = payload.data;
    store.statDecodeIdInc();
  } catch (err) {
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

function normalizePartNumberValue(value) {
  const text = normalizeComboValue(value).trim();
  const hit = suggestions.value.find(item => item.value === text || item.title === text);
  if (hit) return hit.value;
  return text.split(/\s+\/\s+/).at(1) || text;
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

async function selectPartNumber(value) {
  const text = normalizeComboValue(value).trim();
  const hit = suggestions.value.find(item => item.value === text || item.title === text);
  if (hit) {
    commitPartNumber(hit.value);
    await decode();
    return;
  }
  partNumber.value = normalizePartNumberValue(value);
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
      const payload = await searchPartNumber(query, 10);
      if (requestId !== suggestionRequestId) return;
      suggestions.value = toList(payload.data).map(item => parsePartNumberSuggestion(item, query));
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
    const payload = await summarizePartNumber(pn);
    await copyLine(payload.data, t('dashboard.copiedSummary'));
  } catch (err) {
    notify(t('alert.fetchFailed', [err.message || err]));
  } finally {
    loading.value = false;
  }
}

function copyOverview() {
  const lines = [...identityMetrics.value, ...geometryMetrics.value, ...electricalMetrics.value]
    .map(item => `${item.label}: ${displayValue(item.value)}`);
  copyLine(lines.join('\n'));
}

function copyExtraInfo() {
  copyLine(extraInfo.value.map(item => `${item.name}: ${item.value}`).join(', '));
}

function copyFlashIds() {
  copyLine(flashIds.value.map(item => item.id).join(', '));
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
  if (route.query.pn) {
    partNumber.value = String(route.query.pn);
    decode(false);
  } else {
    focusInput();
  }
});

watch(() => route.query.pn, value => {
  if (value && value !== partNumber.value) {
    partNumber.value = String(value);
    decode(false);
  } else if (!value) {
    partNumber.value = '';
    result.value = null;
    clearSuggestions();
    focusInput();
  }
});
</script>
