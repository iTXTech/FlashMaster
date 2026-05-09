<template>
  <div class="workspace">
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
            <div class="panel-title">{{ $t('dashboard.relatedData') }}</div>
            <div class="panel-meta">{{ $t('dashboard.resultCount', [rows.length]) }}</div>
          </div>
        </div>
        <PagedTable :headers="headers" :items="rows">
          <template #card="{ item }">
            <div class="search-card-header">
              <button class="search-card-title" type="button" @click="router.push({ path: '/decodeId', query: { id: item.id } })">
                {{ item.id }}
              </button>
              <v-btn icon="mdi-memory" size="small" variant="text" @click="router.push({ path: '/decodeId', query: { id: item.id } })" />
            </div>
            <div class="search-card-grid">
              <div class="search-card-field">
                <div class="search-card-label">{{ $t('pageSize') }}</div>
                <div class="search-card-value">{{ displayTableValue(item.pageSize) }}</div>
              </div>
              <div class="search-card-field">
                <div class="search-card-label">{{ $t('blocks') }}</div>
                <div class="search-card-value">{{ displayTableValue(item.blocks) }}</div>
              </div>
            </div>
            <div class="search-card-detail-grid">
              <div class="search-card-section">
                <div class="search-card-label">{{ $t('partNumber') }}</div>
                <ExpandableListCell :items="item.partNumberList" :limit="3" clickable @select="decodePartNumber" />
              </div>
              <div class="search-card-section">
                <div class="search-card-label">{{ $t('controllers') }}</div>
                <ExpandableListCell :items="item.controllerList" :limit="4" />
              </div>
            </div>
          </template>
          <template #geometry="{ item }">
            <div class="table-kv-stack">
              <div>{{ $t('pageSize') }} {{ displayTableValue(item.pageSize) }}</div>
              <div>{{ $t('blocks') }} {{ displayTableValue(item.blocks) }}</div>
            </div>
          </template>
          <template #partNumbers="{ item }">
            <ExpandableListCell :items="item.partNumberList" :limit="2" clickable @select="decodePartNumber" />
          </template>
          <template #controllers="{ item }">
            <ExpandableListCell :items="item.controllerList" :limit="3" />
          </template>
          <template #action="{ item }">
            <v-btn icon="mdi-memory" variant="text" @click="router.push({ path: '/decodeId', query: { id: item.id } })" />
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
import { searchFlashId } from '@/services/flashApi';
import { trackLookup } from '@/services/analytics';
import { parsePartNumberToken } from '@/services/resultParser';
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
  { title: t('controllers'), key: 'controllers', class: 'search-list-col search-controller-col' },
  { title: t('action'), key: 'action' }
]);

function normalizeInput() {
  flashId.value = store.partNumberFormat(flashId.value || '');
  return flashId.value;
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
  if (syncRoute && route.query.id !== id) {
    router.push({ path: '/searchId', query: { id } });
  }
  loading.value = true;
  try {
    const payload = await searchFlashId(id);
    rows.value = Object.entries(payload.data || {}).map(([flashId, data]) => {
      const partNumberList = (Array.isArray(data.partNumbers) ? data.partNumbers : []).map(parsePartNumberToken);
      const controllerList = Array.isArray(data.controllers) ? data.controllers.filter(Boolean) : [];
      return {
        id: flashId,
        pageSize: data.pageSize,
        blocks: data.blocks,
        partNumbers: partNumberList.join(', '),
        partNumberList,
        controllers: controllerList.join(', '),
        controllerList
      };
    });
    store.statSearchIdInc();
    trackLookup({
      target: 'flashid',
      action: 'search',
      query: id,
      resultCount: rows.value.length
    });
  } catch (err) {
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
  router.push({ path: '/decodeId', query: { id } });
}

function decodePartNumber(pn) {
  router.push({ path: '/decode', query: { pn } });
}

function displayTableValue(value) {
  return value == null || value === '' ? '-' : value;
}

function notify(text) {
  bus.emit('snackbar', { timeout: 3000, show: true, text });
}

onMounted(() => {
  if (route.query.id) {
    flashId.value = store.queryInputFormat(route.query.id);
    search(false);
  } else {
    nextTick(() => input.value?.focus?.());
  }
});

watch(() => route.query.id, value => {
  const next = store.queryInputFormat(value);
  if (next && next !== flashId.value) {
    flashId.value = next;
    search(false);
  }
});
</script>
