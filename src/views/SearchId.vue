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
            v-model="flashId"
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

      <section class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('dashboard.relatedData') }}</div>
            <div class="panel-meta">{{ $t('dashboard.resultCount', [rows.length]) }}</div>
          </div>
        </div>
        <PagedTable :headers="headers" :items="rows">
          <template #action="{ item }">
            <v-btn icon="mdi-memory" variant="text" @click="router.push({ path: '/decodeId', query: { id: item.id } })" />
            <v-menu v-if="item.partNumberList.length > 0">
              <template #activator="{ props }">
                <v-btn v-bind="props" icon="mdi-format-list-bulleted" variant="text" />
              </template>
              <v-list density="compact">
                <v-list-item
                  v-for="pn in item.partNumberList"
                  :key="pn"
                  :title="pn"
                  @click="router.push({ path: '/decode', query: { pn } })"
                />
              </v-list>
            </v-menu>
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

const headers = computed(() => [
  { title: t('flashId'), key: 'id' },
  { title: t('pageSize'), key: 'pageSize' },
  { title: t('blocks'), key: 'blocks' },
  { title: t('pagesPerBlock'), key: 'pagesPerBlock' },
  { title: t('partNumber'), key: 'partNumbers' },
  { title: t('controllers'), key: 'controllers' },
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
      const controllers = Array.isArray(data.controllers) ? data.controllers.join(', ') : '';
      return {
        id: flashId,
        pageSize: data.pageSize,
        blocks: data.blocks,
        pagesPerBlock: data.pagesPerBlock,
        partNumbers: partNumberList.join(', '),
        partNumberList,
        controllers
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

function notify(text) {
  bus.emit('snackbar', { timeout: 3000, show: true, text });
}

onMounted(() => {
  if (route.query.id) {
    flashId.value = String(route.query.id);
    search(false);
  } else {
    nextTick(() => input.value?.focus?.());
  }
});

watch(() => route.query.id, value => {
  if (value && value !== flashId.value) {
    flashId.value = String(value);
    search(false);
  }
});
</script>
