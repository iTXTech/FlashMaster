<template>
  <div class="workspace workspace--decode-id">
    <section class="panel lookup-query-panel">
      <div class="lookup-query-bar">
        <QuerySuggestionInput
          ref="input"
          v-model="flashIdInput"
          :items="suggestions"
          :loading="loadingSuggestions || loading"
          :error="result?.status === 'invalid_input'"
          :aria-invalid="result?.status === 'invalid_input' || undefined"
          :aria-describedby="result?.status === 'invalid_input' ? 'decode-state-description decode-warnings' : undefined"
          :label="$t('flashId')"
          @search="searchSuggestions"
          @select="selectFlashIdSuggestion"
          @submit="decode"
          @compositionstart="onCompositionStart"
          @compositionend="onCompositionEnd"
          @blur="onBlur"
        />
        <div class="lookup-query-actions">
          <v-btn color="primary" prepend-icon="mdi-memory" :disabled="!flashId" @click="decode">{{ $t('searchIdPage.query') }}</v-btn>
          <v-btn variant="tonal" prepend-icon="mdi-magnify" :disabled="!flashId" @click="goSearchId">{{ $t('searchIdPage.search') }}</v-btn>
        </div>
      </div>
    </section>
    <DecodeResultPanel
      kind="fid"
      :result="result"
      :loading="loading"
      :error="requestFailure"
      @copy-overview="copyOverview"
      @copy-block="copyBlock"
      @example="fillExample"
      @search="searchRelated"
      @retry="retryLookup"
    />
    <PwaInstallPrompt v-if="!singleFile" :successful="result?.status === 'ok' && !loading" />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import DecodeResultPanel from '@/components/DecodeResultPanel.vue';
import PwaInstallPrompt from '@/components/PwaInstallPrompt.vue';
import QuerySuggestionInput from '@/components/QuerySuggestionInput.vue';
import { copyText } from '@/services/clipboard';
import { decodeFlashId, searchFlashId } from '@/services/flashApi';
import { isRequestAbortError, isRequestTimeoutError, SUGGESTION_REQUEST_TIMEOUT_MS } from '@/services/requestControl';
import {
  identifierSuggestions,
  summaryText,
} from '@/services/fdnextResultView';
import { trackCoverageSignal, trackFlashIdLookup } from '@/services/analytics';
import { useFormattedQueryInput } from '@/composables/useFormattedQueryInput';
import { useRouteLookup } from '@/composables/useRouteLookup';
import { idRoute, idsSearchRoute, routeParamText } from '@/router/locations';
import bus from '@/store/bus';
import store from '@/store';

const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();
const input = ref(null);
const singleFile = __FLASHMASTER_SINGLEFILE__;

const flashId = ref('');
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

const {
  model: flashIdInput,
  onCompositionStart,
  onCompositionEnd,
  onBlur
} = useFormattedQueryInput(flashId, {
  format: store.queryInputFormat,
  normalize: normalizeComboValue
});

function normalizeComboValue(value) {
  if (value && typeof value === 'object') {
    return value.value || value.title || '';
  }
  return String(value || '');
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

function routeFlashId() {
  return store.partNumberFormat(routeParamText(route, 'id'));
}

function decodeResultCount(payload) {
  if (payload?.status === 'ok') return 1;
  return Array.isArray(payload?.candidates) ? payload.candidates.length : 0;
}

function decode() {
  const id = normalizeInput();
  if (!id) {
    resetLookup('');
    notify(t('alert.missingFlashId'));
    return;
  }
  return routeLookup.submit(id);
}

async function runLookup(id, { recordUsage = true } = {}) {
  const requestId = ++decodeRequestId;
  const controller = beginMainRequest();
  if (store.isAutoHideSoftKeyboard()) {
    input.value?.blur?.();
  }
  loading.value = true;
  try {
    const payload = await decodeFlashId(id, { signal: controller.signal });
    if (requestId !== decodeRequestId) return;
    result.value = payload;
    if (recordUsage) {
      const resultCount = decodeResultCount(payload);
      store.statDecodeFidInc();
      trackFlashIdLookup({
        action: 'decode',
        routeName: route.name,
        flashId: id,
        resultCount,
        success: payload.status === 'ok'
      });
      trackCoverageSignal({
        type: 'flash_id',
        action: 'decode',
        routeName: route.name,
        query: id,
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
      trackFlashIdLookup({
        action: 'decode',
        routeName: route.name,
        flashId: id,
        success: false
      });
      trackCoverageSignal({
        type: 'flash_id',
        action: 'decode',
        routeName: route.name,
        query: id,
        status: 'request_failed',
        operation: 'identifier.decode',
        success: false
      });
    }
    requestFailure.value = {
      kind: isRequestTimeoutError(err) ? 'timeout' : 'request_failed',
      message: isRequestTimeoutError(err) ? '' : String(err.message || err),
      query: id,
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

async function selectFlashIdSuggestion(item) {
  commitFlashId(item?.value);
  await decode();
}

function searchSuggestions(inputValue) {
  clearTimeout(suggestionTimer);
  suggestionRequestController?.abort();
  suggestionRequestController = undefined;
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
  suggestions.value = [];
  loadingSuggestions.value = true;
  suggestionTimer = setTimeout(async () => {
    const controller = new AbortController();
    suggestionRequestController = controller;
    loadingSuggestions.value = true;
    try {
      const payload = await searchFlashId(query, 10, {
        signal: controller.signal,
        automatic: true,
        timeoutMs: SUGGESTION_REQUEST_TIMEOUT_MS
      });
      if (requestId !== suggestionRequestId) return;
      suggestions.value = identifierSuggestions(payload);
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

function goSearchId() {
  const id = normalizeInput();
  if (!id) return notify(t('alert.missingFlashId'));
  router.push(idsSearchRoute(id, route));
}

function fillExample(query) {
  commitFlashId(query);
  focusInput();
}

function searchRelated(query) {
  router.push(idsSearchRoute(query, route));
}

function retryLookup(query) {
  return routeLookup.submit(commitFlashId(query));
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
  flashId.value = query;
  result.value = null;
  requestFailure.value = null;
  clearSuggestions();
  if (!query) {
    focusInput();
  }
}

const routeLookup = useRouteLookup({
  query: routeFlashId,
  locale,
  navigate: query => router.push(idRoute(query, route)),
  reset: resetLookup,
  run: runLookup
});

onBeforeUnmount(() => {
  decodeRequestId += 1;
  cancelMainRequest();
  clearSuggestions();
});
</script>
