<template>
  <div class="workspace">
    <div class="settings-grid">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">{{ $t('settings.engine') }}</div>
        </div>
        <div class="panel-body query-stack">
          <v-select
            v-model="parserMode"
            :items="parserModes"
            item-title="title"
            item-value="value"
            hide-details
            :label="$t('settings.parserMode')"
            @update:model-value="changeParserMode"
          />
          <v-combobox
            v-if="isHttpParser"
            v-model="server"
            :items="serverItems"
            item-title="title"
            item-value="address"
            :return-object="false"
            hide-details
            clearable
            :label="$t('settings.serverAddr')"
            @update:model-value="changeServer"
            @blur="commitServer"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props" :title="item.raw.title" :subtitle="item.raw.subtitle" />
            </template>
          </v-combobox>
          <div v-if="isHttpParser" class="server-address-line">
            <v-icon icon="mdi-paperclip" size="18" />
            <span>{{ activeServerAddress }}</span>
          </div>
          <div v-else class="server-address-line">
            <v-icon icon="mdi-chip" size="18" />
            <span>{{ $t('settings.embeddedParserInfo', [embeddedParserVersion]) }}</span>
          </div>
          <div class="action-row">
            <v-btn color="primary" prepend-icon="mdi-information-outline" @click="serverInfo">{{ infoButtonLabel }}</v-btn>
            <v-btn v-if="isHttpParser" variant="tonal" prepend-icon="mdi-refresh" :loading="loadingServers" @click="loadServers">{{ $t('settings.refreshServers') }}</v-btn>
          </div>
          <v-progress-linear v-if="loadingServers || loadingInfo" indeterminate color="primary" />
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">{{ $t('customization.title') }}</div>
        </div>
        <div class="panel-body query-stack">
          <v-select
            v-model="currentTheme"
            :items="themes"
            item-title="title"
            item-value="value"
            hide-details
            :label="$t('customization.theme')"
            @update:model-value="changeTheme"
          />
          <v-checkbox
            v-model="hideKeyboard"
            :label="$t('customization.autoHideSoftKeyboard')"
            @update:model-value="value => store.setAutoHideSoftKeyboard(value)"
          />
          <v-checkbox
            v-model="bitUnit"
            :label="$t('customization.bitUnit')"
            @update:model-value="value => store.setBitUnit(value)"
          />
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">{{ $t('statistic.title') }}</div>
        </div>
        <div class="panel-body">
          <div class="metric-grid">
            <div v-for="item in stats" :key="item.label" class="metric">
              <div class="metric-label">{{ item.label }}</div>
              <div class="metric-value">{{ item.value }}</div>
            </div>
          </div>
          <div class="action-row mt-3">
            <v-btn variant="tonal" prepend-icon="mdi-refresh" @click="resetStat">{{ $t('statistic.reset') }}</v-btn>
          </div>
        </div>
      </section>
    </div>

    <v-dialog v-model="dialog.show" max-width="560">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">{{ $t('settings.fdServerInfo') }}</div>
          <v-btn icon="mdi-close" variant="text" @click="dialog.show = false" />
        </div>
        <div class="panel-body">
          <div v-html="dialog.text" />
        </div>
      </section>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getEmbeddedVersion } from '@/services/fdnextApi';
import { getServerInfo, loadServerList } from '@/services/flashApi';
import bus from '@/store/bus';
import store from '@/store';
import themeManager from '@/theme';

const { t } = useI18n();

const fallbackServers = {
  'Server #1 (SakurACG)': 'https://fd.sakuracg.com',
  '默认本地服务器 / Default Local Server': 'http://127.0.0.1:8080'
};

const servers = ref({});
const server = ref(store.getServerAddress());
const parserMode = ref(store.getParserMode());
const currentTheme = ref(store.getTheme());
const hideKeyboard = ref(store.isAutoHideSoftKeyboard());
const bitUnit = ref(store.isBitUnit());
const loadingServers = ref(false);
const loadingInfo = ref(false);
const statsState = ref(readStats());
const embeddedParserVersion = getEmbeddedVersion();
const dialog = ref({
  show: false,
  text: ''
});

const serverRecords = computed(() => {
  const merged = { ...fallbackServers, ...servers.value };
  const seen = new Set();
  return Object.entries(merged)
    .filter(([, address]) => typeof address === 'string' && address.trim())
    .filter(([, address]) => {
      const normalized = address.trim();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .map(([name, address]) => ({
      title: name,
      address: address.trim(),
      subtitle: address.trim()
    }));
});
const activeServerAddress = computed(() => normalizeServer(server.value) || store.getDefaultServerAddress());
const activeServerRecord = computed(() => {
  const hit = serverRecords.value.find(item => item.address === activeServerAddress.value);
  return hit || {
    title: t('settings.customServer'),
    address: activeServerAddress.value,
    subtitle: activeServerAddress.value
  };
});
const serverItems = computed(() => {
  const hit = serverRecords.value.some(item => item.address === activeServerAddress.value);
  return hit ? serverRecords.value : [activeServerRecord.value, ...serverRecords.value];
});
const themes = computed(() => [
  { title: t('customization.theme_0'), value: themeManager.THEME_DARK },
  { title: t('customization.theme_1'), value: themeManager.THEME_LIGHT },
  { title: t('customization.theme_2'), value: themeManager.THEME_SYSTEM }
]);
const parserModes = computed(() => [
  { title: t('settings.parserEmbedded'), value: store.PARSER_EMBEDDED },
  { title: t('settings.parserHttp'), value: store.PARSER_HTTP }
]);
const isHttpParser = computed(() => parserMode.value === store.PARSER_HTTP);
const infoButtonLabel = computed(() => isHttpParser.value ? t('settings.serverInfo') : t('settings.parserInfo'));

const stats = computed(() => [
  { label: t('nav.decodePartNumber'), value: statsState.value.decodeId },
  { label: t('nav.searchPartNumber'), value: statsState.value.searchPn },
  { label: t('nav.decodeId'), value: statsState.value.decodeFid },
  { label: t('nav.searchFlashId'), value: statsState.value.searchId }
]);

function readStats() {
  return {
    decodeId: store.statDecodeId(),
    searchPn: store.statSearchPn(),
    decodeFid: store.statDecodeFid(),
    searchId: store.statSearchId()
  };
}

function refreshStats() {
  statsState.value = readStats();
}

function normalizeServer(value) {
  if (value && typeof value === 'object') {
    return value.address || '';
  }
  const text = String(value || '').trim();
  const hit = serverRecords.value.find(item => {
    return item.address === text
      || item.title === text
      || `${item.title} ${item.address}` === text
      || `${item.title} · ${item.address}` === text;
  });
  return hit?.address || text;
}

function changeServer(value) {
  server.value = normalizeServer(value) || store.getDefaultServerAddress();
  store.setServerAddress(server.value);
  bus.emit('server');
}

function commitServer() {
  changeServer(server.value);
}

function changeParserMode(value) {
  parserMode.value = value === store.PARSER_HTTP ? store.PARSER_HTTP : store.PARSER_EMBEDDED;
  store.setParserMode(parserMode.value);
  if (isHttpParser.value && Object.keys(servers.value).length === 0) {
    loadServers();
  }
}

function changeTheme(value) {
  store.setTheme(value);
  bus.emit('theme');
}

async function serverInfo() {
  loadingInfo.value = true;
  try {
    const data = await getServerInfo();
    dialog.value = {
      show: true,
      text: t('settings.info', [
        data.ver,
        data.info?.fdb?.time,
        data.info?.flash_cnt,
        data.info?.id_cnt,
        data.info?.mdb_cnt,
        String(data.info?.fdb?.controllers || '').replace(/,/g, ', ')
      ])
    };
  } catch (err) {
    notify(t('alert.fetchFailed', [err.message || err]));
  } finally {
    loadingInfo.value = false;
  }
}

function resetStat() {
  store.resetStat();
  refreshStats();
  notify(t('statistic.resetInfo'));
}

function notify(text) {
  bus.emit('snackbar', { timeout: 3000, show: true, text });
}

async function loadServers() {
  loadingServers.value = true;
  try {
    servers.value = await loadServerList();
  } catch (err) {
    notify(t('alert.fetchServerListFailed', [err.message || err]));
  } finally {
    loadingServers.value = false;
  }
}

onMounted(() => {
  if (isHttpParser.value) {
    loadServers();
  }
});
</script>
