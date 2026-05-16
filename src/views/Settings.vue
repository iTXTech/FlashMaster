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
            @keydown.enter.prevent="commitServer()"
            @blur="commitServer()"
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
          <div class="panel-title">{{ $t('settings.controllerGroups') }}</div>
          <v-btn
            icon="mdi-refresh"
            variant="text"
            :loading="loadingControllerGroups"
            :aria-label="$t('settings.refreshControllerGroups')"
            @click="loadControllerGroups({ notifyOnError: true })"
          />
        </div>
        <div class="panel-body query-stack">
          <v-select
            :model-value="controllerGroups"
            :items="controllerGroupItems"
            item-title="title"
            item-value="value"
            multiple
            chips
            :closable-chips="canRemoveControllerGroups"
            hide-details
            :loading="loadingControllerGroups"
            :label="$t('settings.activeControllerGroups')"
            @update:model-value="changeControllerGroups"
          >
            <template #item="{ item }">
              <v-list-item
                class="controller-group-option"
                :active="isControllerGroupSelected(item.raw.value)"
                :subtitle="item.raw.description || item.raw.value"
                :title="item.raw.title"
                role="option"
                @click.stop.prevent="toggleControllerGroup(item.raw.value)"
              >
                <template #prepend>
                  <v-checkbox-btn
                    class="controller-group-option-checkbox"
                    color="primary"
                    density="compact"
                    :disabled="isLastSelectedControllerGroup(item.raw.value)"
                    :model-value="isControllerGroupSelected(item.raw.value)"
                    :ripple="false"
                    tabindex="-1"
                    @click.stop.prevent="toggleControllerGroup(item.raw.value)"
                  />
                </template>
              </v-list-item>
            </template>
          </v-select>
          <div class="server-address-line">{{ controllerGroupSourceLabel }}</div>
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
            <div v-if="marketPulseAvailable" class="settings-switch-row">
              <span class="settings-switch-label">{{ $t('customization.marketPulse') }}</span>
              <v-switch
                v-model="marketPulse"
                class="settings-switch-control"
                base-color="surface-variant"
                color="primary"
                density="compact"
                hide-details
                :aria-label="$t('customization.marketPulse')"
                @update:model-value="changeMarketPulse"
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
          <CapabilityInfo v-if="dialog.data" :data="dialog.data" />
        </div>
      </section>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import CapabilityInfo from '@/components/CapabilityInfo.vue';
import { getServerInfo } from '@/services/flashApi';
import { trackMarketPulseEvent } from '@/services/analytics';
import bus from '@/store/bus';
import store from '@/store';
import themeManager from '@/theme';

const { locale, t } = useI18n();
const route = useRoute();

const server = ref(store.getServerAddress());
const parserMode = ref(store.getParserMode());
const controllerGroups = ref(store.getControllerGroups());
const currentTheme = ref(store.getTheme());
const hideKeyboard = ref(store.isAutoHideSoftKeyboard());
const marketPulseAvailable = __FLASHMASTER_MARKET_PULSE__;
const marketPulse = ref(marketPulseAvailable && store.isMarketPulseEnabled());
const loadingInfo = ref(false);
const loadingControllerGroups = ref(false);
const statsState = ref(readStats());
const capabilityData = ref(null);
const dialog = ref({
  show: false,
  data: null
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
const exclusiveControllerGroups = new Set([
  store.CONTROLLER_GROUP_ALL,
  store.CONTROLLER_GROUP_SELECTED
]);
const controllerGroupItems = computed(() => {
  const groups = capabilityData.value?.inventory?.controllers?.groups;
  if (Array.isArray(groups) && groups.length) {
    return groups
      .filter(group => group?.id)
      .map(group => ({
        title: String(group.title || group.id),
        description: group.description ? String(group.description) : '',
        value: String(group.id),
        props: {
          subtitle: group.description ? String(group.description) : String(group.id)
        }
      }));
  }
  return controllerGroups.value.map(value => ({
    title: value,
    description: '',
    value,
    props: {
      subtitle: value
    }
  }));
});
const controllerGroupSourceLabel = computed(() => capabilityData.value
  ? t('settings.controllerGroupsFromCapabilities')
  : t('settings.controllerGroupsFallback'));
const serverItems = computed(() => store.getServerPresets().map(item => ({
  title: item.id === store.SERVER_PRESET_CLOUD ? t('settings.fdnextCloud') : t('settings.fdnextLocalDev'),
  value: item.address
})));
const isHttpParser = computed(() => parserMode.value === store.PARSER_HTTP);
const infoButtonLabel = computed(() => isHttpParser.value ? t('settings.serverInfo') : t('settings.parserInfo'));
const infoDialogTitle = computed(() => infoButtonLabel.value);
const canRemoveControllerGroups = computed(() => controllerGroups.value.length > 1);

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

function commitServer({ refreshGroups = true } = {}) {
  changeServer(server.value);
  if (refreshGroups && isHttpParser.value) {
    loadControllerGroups();
  }
}

function changeParserMode(value) {
  parserMode.value = value === store.PARSER_HTTP ? store.PARSER_HTTP : store.PARSER_EMBEDDED;
  store.setParserMode(parserMode.value);
  loadControllerGroups();
}

function normalizeControllerGroupSelection(value) {
  const selected = (Array.isArray(value) ? value : [value])
    .map(item => String(item || '').trim())
    .filter(Boolean);
  const previous = controllerGroups.value.length ? controllerGroups.value : [store.CONTROLLER_GROUP_ALL];
  if (!selected.length) {
    return previous;
  }
  const exclusive = selected.filter(item => exclusiveControllerGroups.has(item));
  const newlySelectedExclusive = exclusive.find(item => !previous.includes(item));
  if (newlySelectedExclusive) {
    return [newlySelectedExclusive];
  }
  if (exclusive.length && selected.some(item => !exclusiveControllerGroups.has(item))) {
    return selected.filter(item => !exclusiveControllerGroups.has(item));
  }
  return selected;
}

function isControllerGroupSelected(value) {
  return controllerGroups.value.includes(String(value || ''));
}

function isLastSelectedControllerGroup(value) {
  const group = String(value || '').trim();
  return Boolean(group) && controllerGroups.value.length === 1 && controllerGroups.value[0] === group;
}

function applyControllerGroups(value) {
  store.setControllerGroups(value);
  controllerGroups.value = store.getControllerGroups();
}

function changeControllerGroups(value) {
  applyControllerGroups(normalizeControllerGroupSelection(value));
}

function toggleControllerGroup(value) {
  const group = String(value || '').trim();
  if (!group) return;
  if (isLastSelectedControllerGroup(group)) return;
  if (exclusiveControllerGroups.has(group)) {
    applyControllerGroups([group]);
    return;
  }
  const withoutExclusive = controllerGroups.value.filter(item => !exclusiveControllerGroups.has(item));
  const next = withoutExclusive.includes(group)
    ? withoutExclusive.filter(item => item !== group)
    : [...withoutExclusive, group];
  if (next.length) {
    applyControllerGroups(next);
  }
}

function changeTheme(value) {
  store.setTheme(value);
  bus.emit('theme');
}

function changeMarketPulse(value) {
  if (!marketPulseAvailable) return;
  store.setMarketPulseEnabled(value);
  marketPulse.value = store.isMarketPulseEnabled();
  trackMarketPulseEvent({
    event: 'market_pulse_visibility',
    routeName: route.name,
    action: marketPulse.value ? 'enable' : 'disable',
    enabled: marketPulse.value
  });
  bus.emit('marketPulse');
}

async function loadControllerGroups({ notifyOnError = false } = {}) {
  const requestId = ++controllerGroupRequestId;
  loadingControllerGroups.value = true;
  try {
    const data = await getServerInfo();
    if (requestId !== controllerGroupRequestId) return;
    capabilityData.value = data;
    if (dialog.value.show) {
      dialog.value = {
        ...dialog.value,
        data
      };
    }
  } catch (err) {
    if (requestId !== controllerGroupRequestId) return;
    capabilityData.value = null;
    if (notifyOnError) {
      notify(t('alert.fetchFailed', [err.message || err]));
    }
  } finally {
    if (requestId === controllerGroupRequestId) {
      loadingControllerGroups.value = false;
    }
  }
}

async function serverInfo() {
  if (isHttpParser.value) {
    commitServer({ refreshGroups: false });
  }
  loadingInfo.value = true;
  try {
    const data = await getServerInfo();
    capabilityData.value = data;
    dialog.value = {
      show: true,
      data
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

let offMarketPulse;
let controllerGroupRequestId = 0;

onMounted(() => {
  loadControllerGroups();
  offMarketPulse = bus.on('marketPulse', () => {
    marketPulse.value = marketPulseAvailable && store.isMarketPulseEnabled();
  });
});

onUnmounted(() => {
  offMarketPulse?.();
});

watch(locale, () => {
  loadControllerGroups();
});
</script>
