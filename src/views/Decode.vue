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
          <QuerySuggestionInput
            ref="input"
            v-model="partNumberInput"
            :items="suggestions"
            :loading="loadingSuggestions || loading"
            :label="$t('partNumberOrFlashId')"
            @search="searchSuggestions"
            @select="selectPartSuggestion"
            @submit="decode"
            @compositionstart="onCompositionStart"
            @compositionend="onCompositionEnd"
            @blur="onBlur"
          />
          <div class="action-row">
            <v-btn color="primary" prepend-icon="mdi-crosshairs-gps" @click="decode">{{ $t('query') }}</v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-magnify" @click="goSearchPn">{{ $t('search') }}</v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-flash" @click="goSearchId">{{ $t('searchId') }}</v-btn>
          </div>
        </div>
      </section>

      <DecodeResultPanel
        :result="result"
        :header="header"
        :meta="resultPanelMeta"
        :metrics="mainMetrics"
        :warnings="warningRows"
        vendor-metric-class="decode-vendor-metric"
        @copy-overview="copyOverview"
      />
    </div>

    <AutoFlowGrid
      v-if="result"
      class="decode-detail-grid"
    >
      <DecodeDetailBlock
        v-for="block in detailBlockViews"
        :key="block.id"
        :block="block"
        :headers="fieldHeaders"
        panel-class="decode-detail-panel"
        class-prefix="decode-detail-panel"
        @copy-rows="copyRows"
        @copy-line="copyLine"
      />

      <section
        v-if="relations.length > 0"
        class="panel relation-panel decode-relation-panel"
        :class="{ 'decode-relation-panel--wide': relations.length >= 6 }"
      >
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
    </AutoFlowGrid>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AutoFlowGrid from '@/components/AutoFlowGrid.vue';
import DecodeDetailBlock from '@/components/DecodeDetailBlock.vue';
import DecodeResultPanel from '@/components/DecodeResultPanel.vue';
import ExternalLinks from '@/components/ExternalLinks.vue';
import QuerySuggestionInput from '@/components/QuerySuggestionInput.vue';
import { copyText } from '@/services/clipboard';
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
import { trackCoverageSignal, trackPartNumberLookup } from '@/services/analytics';
import { useFormattedQueryInput } from '@/composables/useFormattedQueryInput';
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

const {
  model: partNumberInput,
  onCompositionStart,
  onCompositionEnd,
  onBlur
} = useFormattedQueryInput(partNumber, {
  format: store.queryInputFormat,
  normalize: normalizePartNumberValue
});

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

function decodeResultCount(payload) {
  if (payload?.status === 'ok') return 1;
  return Array.isArray(payload?.candidates) ? payload.candidates.length : 0;
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
      const resultCount = decodeResultCount(payload);
      store.statDecodeIdInc();
      trackPartNumberLookup({
        action: 'decode',
        routeName: route.name,
        partNumber: pn,
        resultCount,
        success: payload.status === 'ok'
      });
      trackCoverageSignal({
        type: 'pn',
        action: 'decode',
        routeName: route.name,
        query: pn,
        status: payload.status,
        resultCount,
        operation: payload.operation
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
      trackCoverageSignal({
        type: 'pn',
        action: 'decode',
        routeName: route.name,
        query: pn,
        status: 'request_failed',
        operation: 'part.decode',
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

async function selectPartSuggestion(item) {
  commitPartNumber(item?.value);
  await decode();
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
  suggestions.value = [];
  loadingSuggestions.value = true;
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
