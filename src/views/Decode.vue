<template>
  <div class="workspace workspace--decode">
    <section class="panel lookup-query-panel">
      <div class="lookup-query-bar">
        <QuerySuggestionInput
          ref="input"
          v-model="partNumberInput"
          :items="suggestions"
          :loading="loadingSuggestions || loading"
          :error="result?.status === 'invalid_input'"
          :aria-invalid="result?.status === 'invalid_input' || undefined"
          :aria-describedby="result?.status === 'invalid_input' ? 'decode-state-description decode-warnings' : undefined"
          :label="$t('partNumber')"
          @search="searchSuggestions"
          @select="selectPartSuggestion"
          @submit="decode"
          @compositionstart="onCompositionStart"
          @compositionend="onCompositionEnd"
          @blur="onBlur"
        />
        <div class="lookup-query-actions">
          <v-btn color="primary" prepend-icon="mdi-crosshairs-gps" :disabled="!partNumber" @click="decode">{{ $t('query') }}</v-btn>
          <v-btn variant="tonal" prepend-icon="mdi-magnify" :disabled="!partNumber" @click="goSearchPn">{{ $t('search') }}</v-btn>
        </div>
      </div>
    </section>
    <DecodeResultPanel
      kind="pn"
      :result="result"
      :loading="loading"
      :error="requestFailure"
      @copy-overview="copyOverview"
      @copy-block="copyBlock"
      @example="fillExample"
      @search="searchRelated"
      @retry="retryLookup"
    />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import DecodeResultPanel from '@/components/DecodeResultPanel.vue';
import QuerySuggestionInput from '@/components/QuerySuggestionInput.vue';
import { copyText } from '@/services/clipboard';
import { decodePartNumber, searchPartNumber } from '@/services/flashApi';
import { isRequestAbortError, isRequestTimeoutError, SUGGESTION_REQUEST_TIMEOUT_MS } from '@/services/requestControl';
import {
  partSuggestions,
  summaryText,
} from '@/services/fdnextResultView';
import { trackCoverageSignal, trackPartNumberLookup } from '@/services/analytics';
import { useFormattedQueryInput } from '@/composables/useFormattedQueryInput';
import { useRouteLookup } from '@/composables/useRouteLookup';
import { partRoute, partsSearchRoute, routeParamText } from '@/router/locations';
import bus from '@/store/bus';
import store from '@/store';

const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();
const input = ref(null);

const partNumber = ref('');
const suggestions = ref([]);
const result = shallowRef(null);
const requestFailure = shallowRef(null);
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
    requestFailure.value = {
      kind: isRequestTimeoutError(err) ? 'timeout' : 'request_failed',
      message: isRequestTimeoutError(err) ? '' : String(err.message || err),
      query: pn,
      http: !store.isEmbeddedParser()
    };
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

function fillExample(query) {
  commitPartNumber(query);
  focusInput();
}

function searchRelated(query) {
  router.push(partsSearchRoute(query, route));
}

function retryLookup(query) {
  return routeLookup.submit(commitPartNumber(query));
}

function copyOverview(mode = 'full') {
  copyLine(summaryText(result.value, mode));
}

function copyBlock(block) {
  copyLine([`[${block.label}]`, ...block.rows.map(item => `${item.name}: ${item.value}`)].join('\n'));
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

function resetLookup(query) {
  decodeRequestId += 1;
  cancelMainRequest();
  loading.value = false;
  suppressedSuggestionValue = query;
  partNumber.value = query;
  result.value = null;
  requestFailure.value = null;
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
