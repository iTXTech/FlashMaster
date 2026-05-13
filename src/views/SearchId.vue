<template>
  <div class="workspace workspace--search workspace--search-id">
    <div class="workspace-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('searchId') }}</div>
          </div>
          <v-btn icon="mdi-arrow-right" variant="text" @click="search" />
        </div>
        <div class="panel-body query-stack">
          <v-text-field
            ref="input"
            v-model="flashIdInput"
            class="pn"
            clearable
            hide-details
            prepend-inner-icon="mdi-magnify"
            :label="$t('flashId')"
            @keydown.enter.prevent="search"
          />
          <div class="action-row">
            <v-btn color="primary" prepend-icon="mdi-magnify" @click="search">{{ $t('searchId') }}</v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-memory" :disabled="!flashId" @click="decodeCurrent">{{ $t('searchIdPage.query') }}</v-btn>
          </div>
          <v-progress-linear v-if="loading" indeterminate color="primary" />
        </div>
      </section>

      <section class="panel search-results-panel search-id-results-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('dashboard.searchResults') }}</div>
            <div class="panel-meta">{{ $t('dashboard.resultCount', [rows.length]) }}</div>
          </div>
        </div>
        <PagedTable :headers="headers" :items="rows" :per-page-options="[10, 15, 30, 50]" :show-footer-count="false">
          <template #card="{ item }">
            <div class="search-id-card-layout">
              <div class="search-id-card-summary">
                <div class="search-card-header">
                  <button class="search-card-title" type="button" @click="decodeIdentifier(item.id)">
                    {{ item.id }}
                  </button>
                </div>
                <div class="search-card-grid">
                  <div class="search-card-field">
                    <div class="search-card-label">{{ $t('vendor') }}</div>
                    <div class="search-card-value">{{ item.vendor || $t('unknown') }}</div>
                  </div>
                  <div class="search-card-field">
                    <div class="search-card-label">{{ $t('dashboard.geometry') }}</div>
                    <div class="search-card-value">{{ item.geometry || '-' }}</div>
                  </div>
                </div>
              </div>
              <div v-if="item.partNumberList.length > 0" class="search-card-detail-grid search-card-detail-grid--single">
                <div class="search-card-section">
                  <div class="search-card-label">{{ $t('partNumber') }}</div>
                  <ExpandableListCell class="search-part-number-list" :items="item.partNumberList" :limit="6" clickable @select="decodePartNumber" />
                </div>
              </div>
              <ExternalLinks v-if="item.links.length > 0" class="search-card-links" :links="item.links" compact />
            </div>
          </template>
          <template #id="{ item }">
            <ExpandableListCell :items="[item.id]" :limit="1" clickable @select="decodeIdentifier" />
          </template>
          <template #geometry="{ item }">
            <div class="table-kv-stack">{{ item.geometry || item.fieldSummary || '-' }}</div>
          </template>
          <template #partNumbers="{ item }">
            <ExpandableListCell :items="item.partNumberList" :limit="2" clickable @select="decodePartNumber" />
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
import ExternalLinks from '@/components/ExternalLinks.vue';
import PagedTable from '@/components/PagedTable.vue';
import { searchFlashId } from '@/services/flashApi';
import { identifierSearchRows } from '@/services/fdnextResultView';
import { trackLookup } from '@/services/analytics';
import { idRoute, idsSearchRoute, partRoute, routeParamText } from '@/router/locations';
import bus from '@/store/bus';
import store from '@/store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const input = ref(null);

const flashId = ref('');
const rows = ref([]);
const loading = ref(false);
const flashIdInput = computed({
  get: () => flashId.value,
  set: value => {
    flashId.value = store.queryInputFormat(value);
  }
});

const headers = computed(() => [
  { title: t('flashId'), key: 'id', class: 'search-id-col' },
  { title: t('dashboard.geometry'), key: 'geometry', class: 'search-geometry-col' },
  { title: t('partNumber'), key: 'partNumbers', class: 'search-list-col' },
  { title: t('action'), key: 'action' }
]);

function normalizeInput() {
  flashId.value = store.partNumberFormat(flashId.value || '');
  return flashId.value;
}

function routeSearchQuery() {
  return store.queryInputFormat(routeParamText(route, 'query'));
}

async function search(syncRoute = true) {
  const id = normalizeInput();
  if (!id) {
    notify(t('alert.missingFlashId'));
    return;
  }
  if (store.isAutoHideSoftKeyboard()) {
    input.value?.blur?.();
  }
  if (syncRoute && routeSearchQuery() !== id) {
    router.push(idsSearchRoute(id, route));
  }
  loading.value = true;
  try {
    const payload = await searchFlashId(id);
    rows.value = identifierSearchRows(payload);
    store.statSearchIdInc();
    trackLookup({
      target: 'flashid',
      action: 'search',
      query: id,
      resultCount: rows.value.length
    });
  } catch (err) {
    rows.value = [];
    trackLookup({
      target: 'flashid',
      action: 'search',
      query: id,
      success: false
    });
    notify(t('alert.fetchFailed', [err.message || err]));
  } finally {
    loading.value = false;
  }
}

function decodeCurrent() {
  const id = normalizeInput();
  if (!id) return notify(t('alert.missingFlashId'));
  router.push(idRoute(id, route));
}

function decodeIdentifier(id) {
  router.push(idRoute(id, route));
}

function decodePartNumber(pn) {
  router.push(partRoute(pn, route));
}

function notify(text) {
  bus.emit('snackbar', { timeout: 3000, show: true, text });
}

onMounted(() => {
  const query = routeSearchQuery();
  if (query) {
    flashId.value = query;
    search(false);
  } else {
    nextTick(() => input.value?.focus?.());
  }
});

watch(() => route.params.query, () => {
  const next = routeSearchQuery();
  if (next && next !== flashId.value) {
    flashId.value = next;
    search(false);
  } else if (!next) {
    flashId.value = '';
    rows.value = [];
    nextTick(() => input.value?.focus?.());
  }
});
</script>
