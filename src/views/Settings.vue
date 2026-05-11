<template>
  <div class="workspace workspace--settings">
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
            item-title="value"
            item-value="value"
            :return-object="false"
            hide-details
            clearable
            :label="$t('settings.serverAddr')"
            @update:model-value="changeServer"
            @keydown.enter.prevent="commitServer"
            @blur="commitServer"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props" :title="item.raw.title" :subtitle="item.raw.value" />
            </template>
          </v-combobox>
          <div class="action-row">
            <v-btn color="primary" prepend-icon="mdi-information-outline" @click="serverInfo">{{ infoButtonLabel }}</v-btn>
          </div>
          <v-progress-linear v-if="loadingInfo" indeterminate color="primary" />
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
          <div class="settings-switch-list">
            <div class="settings-switch-row">
              <span class="settings-switch-label">{{ $t('customization.autoHideSoftKeyboard') }}</span>
              <v-switch
                v-model="hideKeyboard"
                class="settings-switch-control"
                base-color="surface-variant"
                color="primary"
                density="compact"
                hide-details
                :aria-label="$t('customization.autoHideSoftKeyboard')"
                @update:model-value="value => store.setAutoHideSoftKeyboard(value)"
              />
            </div>
            <div class="settings-switch-row">
              <span class="settings-switch-label">{{ $t('customization.marketTicker') }}</span>
              <v-switch
                v-model="marketTicker"
                class="settings-switch-control"
                base-color="surface-variant"
                color="primary"
                density="compact"
                hide-details
                :aria-label="$t('customization.marketTicker')"
                @update:model-value="changeMarketTicker"
              />
            </div>
          </div>
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

    <v-dialog
      v-model="dialog.show"
      max-width="760"
      class="server-info-dialog"
      content-class="server-info-dialog-content"
    >
      <section class="panel server-info-panel">
        <div class="panel-header">
          <div class="panel-title">{{ infoDialogTitle }}</div>
          <v-btn icon="mdi-close" variant="text" @click="dialog.show = false" />
        </div>
        <div class="panel-body server-info-body">
          <div class="server-info-content" @click="handleServerInfoClick" v-html="dialog.text" />
        </div>
      </section>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getServerInfo } from '@/services/flashApi';
import { decoderGroupFromEvent, formatServerInfo } from '@/services/capabilityHtml';
import bus from '@/store/bus';
import store from '@/store';
import themeManager from '@/theme';

const { t } = useI18n();

const server = ref(store.getServerAddress());
const parserMode = ref(store.getParserMode());
const currentTheme = ref(store.getTheme());
const hideKeyboard = ref(store.isAutoHideSoftKeyboard());
const marketTicker = ref(store.isMarketTickerEnabled());
const loadingInfo = ref(false);
const statsState = ref(readStats());
const dialog = ref({
  show: false,
  text: '',
  data: null
});
const expandedDecoderGroups = ref({});

const themes = computed(() => [
  { title: t('customization.theme_0'), value: themeManager.THEME_DARK },
  { title: t('customization.theme_1'), value: themeManager.THEME_LIGHT },
  { title: t('customization.theme_2'), value: themeManager.THEME_SYSTEM }
]);
const parserModes = computed(() => [
  { title: t('settings.parserEmbedded'), value: store.PARSER_EMBEDDED },
  { title: t('settings.parserHttp'), value: store.PARSER_HTTP }
]);
const serverItems = computed(() => store.getServerPresets().map(item => ({
  title: item.id === store.SERVER_PRESET_CLOUD ? t('settings.fdnextCloud') : t('settings.fdnextLocalDev'),
  value: item.address
})));
const isHttpParser = computed(() => parserMode.value === store.PARSER_HTTP);
const infoButtonLabel = computed(() => isHttpParser.value ? t('settings.serverInfo') : t('settings.parserInfo'));
const infoDialogTitle = computed(() => infoButtonLabel.value);

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
  return String(value || '').trim();
}

function changeServer(value) {
  const next = normalizeServer(value) || store.getDefaultServerAddress();
  server.value = next;
  store.setServerAddress(next);
  bus.emit('server');
}

function commitServer() {
  changeServer(server.value);
}

function changeParserMode(value) {
  parserMode.value = value === store.PARSER_HTTP ? store.PARSER_HTTP : store.PARSER_EMBEDDED;
  store.setParserMode(parserMode.value);
}

function changeTheme(value) {
  store.setTheme(value);
  bus.emit('theme');
}

function changeMarketTicker(value) {
  store.setMarketTickerEnabled(value);
  marketTicker.value = store.isMarketTickerEnabled();
  bus.emit('marketTicker');
}

async function serverInfo() {
  if (isHttpParser.value) {
    commitServer();
  }
  loadingInfo.value = true;
  try {
    const data = await getServerInfo();
    expandedDecoderGroups.value = {};
    dialog.value = {
      show: true,
      data,
      text: formatServerInfo(data, t, expandedDecoderGroups.value)
    };
  } catch (err) {
    notify(t('alert.fetchFailed', [err.message || err]));
  } finally {
    loadingInfo.value = false;
  }
}

function handleServerInfoClick(event) {
  const group = decoderGroupFromEvent(event);
  if (!group || !dialog.value.data) return;
  expandedDecoderGroups.value = {
    ...expandedDecoderGroups.value,
    [group]: !expandedDecoderGroups.value[group]
  };
  dialog.value = {
    ...dialog.value,
    text: formatServerInfo(dialog.value.data, t, expandedDecoderGroups.value)
  };
}

function resetStat() {
  store.resetStat();
  refreshStats();
  notify(t('statistic.resetInfo'));
}

function notify(text) {
  bus.emit('snackbar', { timeout: 3000, show: true, text });
}

let offMarketTicker;

onMounted(() => {
  offMarketTicker = bus.on('marketTicker', () => {
    marketTicker.value = store.isMarketTickerEnabled();
  });
});

onUnmounted(() => {
  offMarketTicker?.();
});
</script>
