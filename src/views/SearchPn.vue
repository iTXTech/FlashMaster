<template>
  <div class="workspace">
    <div class="workspace-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('search') }}</div>
          </div>
          <v-btn icon="mdi-arrow-right" variant="text" @click="search" />
        </div>
        <div class="panel-body query-stack">
          <v-text-field
            ref="input"
            v-model="partNumberInput"
            class="pn"
            clearable
            hide-details
            prepend-inner-icon="mdi-magnify"
            :label="$t('partNumber')"
            @keydown.enter.prevent="search"
          />
          <div class="action-row">
            <v-btn color="primary" prepend-icon="mdi-magnify" @click="search">{{ $t('search') }}</v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-crosshairs-gps" :disabled="!partNumber" @click="decodeCurrent">{{ $t('query') }}</v-btn>
          </div>
          <v-progress-linear v-if="loading" indeterminate color="primary" />
        </div>
      </section>

      <section class="panel search-results-panel search-pn-results-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('dashboard.relatedData') }}</div>
            <div class="panel-meta">{{ $t('dashboard.resultCount', [rows.length]) }}</div>
          </div>
        </div>
        <PagedTable :headers="headers" :items="rows" :per-page-options="[10, 15, 30, 50]" :show-footer-count="false">
          <template #card="{ item }">
            <div class="search-card-header">
              <div class="search-pn-card-content">
                <div class="search-card-label">{{ item.vendor || $t('unknown') }}</div>
                <button class="search-card-title" type="button" @click="decodePartNumber(item.pn)">
                  {{ item.pn }}
                </button>
                <div v-if="item.shortCode" class="search-card-code-line">
                  <span class="search-card-code-label">{{ $t('shortCode') }}</span>
                  <button class="search-card-code" type="button" @click="decodePartNumber(item.shortCode)">
                    {{ item.shortCode }}
                  </button>
                </div>
              </div>
            </div>
          </template>
          <template #pn="{ item }">
            <ExpandableListCell :items="[item.pn]" :limit="1" clickable @select="decodePartNumber" />
          </template>
        </PagedTable>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import ExpandableListCell from '@/components/ExpandableListCell.vue';
import PagedTable from '@/components/PagedTable.vue';
import { searchPartNumber } from '@/services/flashApi';
import { trackLookup } from '@/services/analytics';
import { parsePartNumberResult } from '@/services/resultParser';
import bus from '@/store/bus';
import store from '@/store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const input = ref(null);

const partNumber = ref('');
const rows = ref([]);
const loading = ref(false);
const partNumberInput = computed({
  get: () => partNumber.value,
  set: value => {
    partNumber.value = store.queryInputFormat(value);
  }
});

const headers = computed(() => [
  { title: t('vendor'), key: 'vendor', class: 'search-vendor-col' },
  { title: t('partNumber'), key: 'pn', class: 'search-list-col' },
  { title: t('action'), key: 'action' }
]);

function normalizeInput() {
  partNumber.value = store.partNumberFormat(partNumber.value || '');
  return partNumber.value;
}

async function search(syncRoute = true) {
  const pn = normalizeInput();
  if (!pn) {
    notify(t('alert.missingPartNumber'));
    return;
  }
  if (store.isAutoHideSoftKeyboard()) {
    input.value?.blur?.();
  }
  if (syncRoute && route.query.pn !== pn) {
    router.push({ path: '/searchPn', query: { pn } });
  }
  loading.value = true;
  try {
    const payload = await searchPartNumber(pn);
    rows.value = (Array.isArray(payload.data) ? payload.data : []).map(item => parsePartNumberResult(item, pn));
    store.statSearchPnInc();
    trackLookup({
      target: 'pn',
      action: 'search',
      query: pn,
      resultCount: rows.value.length
    });
  } catch (err) {
    trackLookup({
      target: 'pn',
      action: 'search',
      query: pn,
      success: false
    });
    notify(t('alert.fetchFailed', [err.message || err]));
  } finally {
    loading.value = false;
  }
}

function decodeCurrent() {
  const pn = normalizeInput();
  if (!pn) return notify(t('alert.missingPartNumber'));
  router.push({ path: '/decode', query: { pn } });
}

function decodePartNumber(pn) {
  router.push({ path: '/decode', query: { pn } });
}

function notify(text) {
  bus.emit('snackbar', { timeout: 3000, show: true, text });
}

onMounted(() => {
  if (route.query.pn) {
    partNumber.value = store.queryInputFormat(route.query.pn);
    search(false);
  } else {
    nextTick(() => input.value?.focus?.());
  }
});

watch(() => route.query.pn, value => {
  const next = store.queryInputFormat(value);
  if (next && next !== partNumber.value) {
    partNumber.value = next;
    search(false);
  }
});
</script>
