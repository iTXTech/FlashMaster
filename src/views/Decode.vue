<template>
  <div class="workspace workspace--decode">
    <div class="workspace-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">{{ $t('dashboard.queryPanel') }}</h2>
          </div>
          <v-btn
            icon="mdi-book-information-variant"
            variant="text"
            :disabled="!partNumber"
            :aria-label="$t('summary')"
            @click="copySummary"
          />
        </div>
        <div class="panel-body query-stack">
          <QuerySuggestionInput
            ref="input"
            v-model="partNumberInput"
            :items="suggestions"
            :loading="loadingSuggestions || loading"
            :label="$t('partNumber')"
            @search="searchSuggestions"
            @select="selectPartSuggestion"
            @submit="decode"
            @compositionstart="onCompositionStart"
            @compositionend="onCompositionEnd"
            @blur="onBlur"
          />
          <div class="action-row">
            <v-btn color="primary" prepend-icon="mdi-crosshairs-gps" :disabled="!partNumber" @click="decode">{{ $t('query') }}</v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-magnify" :disabled="!partNumber" @click="goSearchPn">{{ $t('search') }}</v-btn>
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
            <h2 class="panel-title">{{ $t('dashboard.relatedData') }}</h2>
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
            <h2 class="panel-title">{{ $t('dashboard.externalLinks') }}</h2>
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
import { computed, nextTick, onBeforeUnmount, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AutoFlowGrid from '@/components/AutoFlowGrid.vue';
import DecodeDetailBlock from '@/components/DecodeDetailBlock.vue';
import DecodeResultPanel from '@/components/DecodeResultPanel.vue';
import ExternalLinks from '@/components/ExternalLinks.vue';
import QuerySuggestionInput from '@/components/QuerySuggestionInput.vue';
import { copyText } from '@/services/clipboard';
import { lookupContextKey, decodePartNumber, searchPartNumber, summarizePartNumber } from '@/services/flashApi';
import { isRequestAbortError, isRequestTimeoutError, SUGGESTION_REQUEST_TIMEOUT_MS } from '@/services/requestControl';
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
import { useRouteLookup } from '@/composables/useRouteLookup';
import { localizeRouteLocation, partRoute, partsSearchRoute, routeParamText } from '@/router/locations';
import bus from '@/store/bus';
import store from '@/store';

const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();
const input = ref(null);

const partNumber = ref('');
const suggestions = ref([]);
const result = shallowRef(null);
let resultContextKey = '';
const loading = ref(false);
const loadingSuggestions = ref(false);
let suggestionTimer;
let suggestionRequestId = 0;
let decodeRequestId = 0;
let mainRequestController;
let suggestionRequestController;
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
  if (result.value.status === 'not_found') return t('dashboard.notFound');
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
  suggestionRequestController?.abort();
  suggestionRequestController = undefined;
  suggestions.value = [];
  loadingSuggestions.value = false;
}

function beginMainRequest() {
  mainRequestController?.abort();
  mainRequestController = new AbortController();
  return mainRequestController;
}

function cancelMainRequest() {
  mainRequestController?.abort();
  mainRequestController = undefined;
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
  return store.partNumberFormat(routeParamText(route, 'pn'));
}

function localizedRoute(location) {
  return localizeRouteLocation(location, route);
}

function decodeResultCount(payload) {
  if (payload?.status === 'ok') return 1;
  return Array.isArray(payload?.candidates) ? payload.candidates.length : 0;
}

function decode() {
  const pn = normalizeInput();
  if (!pn) {
    resetLookup('');
    notify(t('alert.missingPartNumber'));
    return;
  }
  return routeLookup.submit(pn);
}

async function runLookup(pn, { recordUsage = true } = {}) {
  const contextKey = lookupContextKey('parts/decode', pn);
  const requestId = ++decodeRequestId;
  const controller = beginMainRequest();
  if (store.isAutoHideSoftKeyboard()) {
    input.value?.blur?.();
  }
  loading.value = true;
  try {
    const payload = await decodePartNumber(pn, { signal: controller.signal });
    if (requestId !== decodeRequestId) return;
    result.value = payload;
    resultContextKey = contextKey;
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
    if (isRequestAbortError(err)) return;
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
    notifyRequestError(err);
  } finally {
    if (requestId === decodeRequestId) {
      loading.value = false;
      if (mainRequestController === controller) {
        mainRequestController = undefined;
      }
    }
  }
}

async function selectPartSuggestion(item) {
  commitPartNumber(item?.value);
  await decode();
}

function searchSuggestions(input) {
  clearTimeout(suggestionTimer);
  suggestionRequestController?.abort();
  suggestionRequestController = undefined;
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
    const controller = new AbortController();
    suggestionRequestController = controller;
    loadingSuggestions.value = true;
    try {
      const payload = await searchPartNumber(query, suggestionLimit, {
        signal: controller.signal,
        automatic: true,
        timeoutMs: SUGGESTION_REQUEST_TIMEOUT_MS
      });
      if (requestId !== suggestionRequestId) return;
      suggestions.value = partSuggestions(payload);
    } catch {
      if (requestId !== suggestionRequestId) return;
      suggestions.value = [];
    } finally {
      if (requestId === suggestionRequestId) {
        loadingSuggestions.value = false;
        if (suggestionRequestController === controller) {
          suggestionRequestController = undefined;
        }
      }
    }
  }, 220);
}

function goSearchPn() {
  const pn = normalizeInput();
  if (!pn) return notify(t('alert.missingPartNumber'));
  router.push(partsSearchRoute(pn, route));
}

async function copySummary() {
  const pn = normalizeInput();
  if (!pn) return notify(t('alert.missingPartNumber'));
  if (result.value && resultContextKey === lookupContextKey('parts/decode', pn)) {
    return copyLine(summaryText(result.value), t('dashboard.copiedSummary'));
  }
  const requestId = ++decodeRequestId;
  const controller = beginMainRequest();
  loading.value = true;
  try {
    const summary = await summarizePartNumber(pn, { signal: controller.signal });
    if (requestId !== decodeRequestId) return;
    await copyLine(summary, t('dashboard.copiedSummary'));
  } catch (err) {
    if (requestId !== decodeRequestId || isRequestAbortError(err)) return;
    notifyRequestError(err);
  } finally {
    if (requestId === decodeRequestId) {
      loading.value = false;
      if (mainRequestController === controller) {
        mainRequestController = undefined;
      }
    }
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

function notifyRequestError(err) {
  notify(isRequestTimeoutError(err)
    ? t('alert.requestTimeout')
    : t('alert.fetchFailed', [err.message || err]));
}

function resetLookup(query) {
  decodeRequestId += 1;
  cancelMainRequest();
  loading.value = false;
  suppressedSuggestionValue = query;
  partNumber.value = query;
  result.value = null;
  clearSuggestions();
  if (!query) {
    focusInput();
  }
}

const routeLookup = useRouteLookup({
  query: routePartNumber,
  locale,
  navigate: query => router.push(partRoute(query, route)),
  reset: resetLookup,
  run: runLookup
});

onBeforeUnmount(() => {
  decodeRequestId += 1;
  cancelMainRequest();
  clearSuggestions();
});
</script>
