<template>
  <div class="workspace workspace--search workspace--search-pn">
    <div class="workspace-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">{{ $t('search') }}</h2>
          </div>
          <v-btn
            icon="mdi-arrow-right"
            variant="text"
            :disabled="!partNumber"
            :aria-label="$t('search')"
            @click="search"
          />
        </div>
        <div class="panel-body query-stack">
          <v-text-field
            ref="input"
            v-model="partNumberInput"
            class="pn"
            clearable
            hide-details
            prepend-inner-icon="mdi-magnify"
            :loading="loading"
            :label="$t('partNumber')"
            @keydown.enter="onEnter"
            @compositionstart="onCompositionStart"
            @compositionend="onCompositionEnd"
            @blur="onBlur"
          />
          <div class="action-row">
            <v-btn color="primary" prepend-icon="mdi-magnify" :disabled="!partNumber" @click="search">{{ $t('search') }}</v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-crosshairs-gps" :disabled="!partNumber" @click="decodeCurrent">{{ $t('query') }}</v-btn>
          </div>
        </div>
      </section>

      <section class="panel search-results-panel search-pn-results-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">{{ $t('dashboard.searchResults') }}</h2>
            <div class="panel-meta">{{ $t('dashboard.resultCount', [rows.length]) }}</div>
          </div>
        </div>
        <PagedTable display="cards" :project-item="partSearchRow" :items="rows" :per-page-options="[10, 15, 30, 50]" :show-footer-count="false">
          <template #card="{ item }">
            <div class="search-card-header">
              <div class="search-pn-card-content">
                <div class="search-pn-vendor-row">
                  <span class="search-pn-vendor">{{ item.vendor || $t('unknown') }}</span>
                  <span v-for="badge in item.badges" :key="badge" class="search-pn-meta-badge">{{ badge }}</span>
                </div>
                <button class="search-card-title" type="button" @click="decodePartNumber(item.pn)">
                  {{ item.pn }}
                </button>
                <div v-if="item.markingCode" class="search-card-code-line">
                  <span class="search-card-code-label">{{ $t('shortCode') }}</span>
                  <button class="search-card-code" type="button" @click="decodePartNumber(item.pn)">
                    {{ item.markingCode }}
                  </button>
                </div>
                <div v-if="item.fieldSummary" class="search-pn-meta-row">
                  <span v-if="item.fieldSummary" class="search-pn-meta-text">{{ item.fieldSummary }}</span>
                </div>
                <ExternalLinks v-if="item.links.length > 0" class="search-card-links" :links="item.links" compact />
              </div>
            </div>
          </template>
        </PagedTable>
      </section>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import ExternalLinks from '@/components/ExternalLinks.vue';
import PagedTable from '@/components/PagedTable.vue';
import { searchPartNumber } from '@/services/flashApi';
import { isRequestAbortError, isRequestTimeoutError } from '@/services/requestControl';
import { partSearchRow } from '@/services/fdnextResultView';
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
const rows = shallowRef([]);
const loading = ref(false);
let searchRequestId = 0;
let searchRequestController;

const {
  model: partNumberInput,
  onCompositionStart,
  onCompositionEnd,
  onBlur,
  shouldSkipEnter
} = useFormattedQueryInput(partNumber, {
  format: store.queryInputFormat
});

function onEnter(event) {
  if (shouldSkipEnter(event)) {
    return;
  }
  event.preventDefault();
  search();
}

function normalizeInput() {
  partNumber.value = store.partNumberFormat(partNumber.value || '');
  return partNumber.value;
}

function routeSearchQuery() {
  return store.partNumberFormat(routeParamText(route, 'query'));
}

function search() {
  const pn = normalizeInput();
  if (!pn) {
    resetLookup('');
    notify(t('alert.missingPartNumber'));
    return;
  }
  return routeLookup.submit(pn);
}

async function runLookup(pn, { recordUsage = true } = {}) {
  const requestId = ++searchRequestId;
  const controller = new AbortController();
  searchRequestController = controller;
  if (store.isAutoHideSoftKeyboard()) {
    input.value?.blur?.();
  }
  loading.value = true;
  try {
    const payload = await searchPartNumber(pn, 0, { signal: controller.signal });
    if (requestId !== searchRequestId) return;
    rows.value = Array.isArray(payload.items) ? payload.items : [];
    if (recordUsage) {
      store.statSearchPnInc();
      trackPartNumberLookup({
        action: 'search',
        routeName: route.name,
        partNumber: pn,
        resultCount: rows.value.length,
        success: payload.status === 'ok'
      });
      trackCoverageSignal({
        type: 'pn',
        action: 'search',
        routeName: route.name,
        query: pn,
        status: payload.status,
        resultCount: rows.value.length,
        operation: payload.operation
      });
    }
  } catch (err) {
    if (requestId !== searchRequestId) return;
    if (isRequestAbortError(err)) return;
    rows.value = [];
    if (recordUsage) {
      trackPartNumberLookup({
        action: 'search',
        routeName: route.name,
        partNumber: pn,
        success: false
      });
      trackCoverageSignal({
        type: 'pn',
        action: 'search',
        routeName: route.name,
        query: pn,
        status: 'request_failed',
        operation: 'part.search',
        success: false
      });
    }
    notify(isRequestTimeoutError(err)
      ? t('alert.requestTimeout')
      : t('alert.fetchFailed', [err.message || err]));
  } finally {
    if (requestId === searchRequestId) {
      loading.value = false;
      if (searchRequestController === controller) {
        searchRequestController = undefined;
      }
    }
  }
}

function decodeCurrent() {
  const pn = normalizeInput();
  if (!pn) return notify(t('alert.missingPartNumber'));
  router.push(partRoute(pn, route));
}

function decodePartNumber(pn) {
  router.push(partRoute(pn, route));
}

function notify(text) {
  bus.emit('snackbar', { timeout: 3000, show: true, text });
}

function resetLookup(query) {
  searchRequestId += 1;
  searchRequestController?.abort();
  searchRequestController = undefined;
  loading.value = false;
  partNumber.value = query;
  rows.value = [];
  if (!query) {
    nextTick(() => input.value?.focus?.());
  }
}

const routeLookup = useRouteLookup({
  query: routeSearchQuery,
  locale,
  navigate: query => router.push(partsSearchRoute(query, route)),
  reset: resetLookup,
  run: runLookup
});

onBeforeUnmount(() => {
  searchRequestId += 1;
  searchRequestController?.abort();
  searchRequestController = undefined;
});
</script>
