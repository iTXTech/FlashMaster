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
          <v-text-field
            v-if="isHttpParser"
            v-model="server"
            hide-details
            clearable
            :label="$t('settings.serverAddr')"
            @update:model-value="updateServerDraft"
            @keydown.enter.prevent="commitServer"
            @blur="commitServer"
          />
          <div v-if="isHttpParser" class="server-address-line">
            <v-icon icon="mdi-paperclip" size="18" />
            <span>{{ activeServerAddress }}</span>
          </div>
          <div v-else-if="!isHttpParser" class="server-address-line">
            <v-icon icon="mdi-chip" size="18" />
            <span>{{ $t('settings.embeddedParserInfo', [embeddedParserVersion]) }}</span>
          </div>
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
import { getEmbeddedVersion } from '@/services/versionInfo';
import { getServerInfo } from '@/services/flashApi';
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
const embeddedParserVersion = getEmbeddedVersion();
const dialog = ref({
  show: false,
  text: '',
  data: null
});
const expandedDecoderGroups = ref({});

const activeServerAddress = computed(() => normalizeServer(server.value) || store.getDefaultServerAddress());
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

function updateServerDraft(value) {
  const next = normalizeServer(value);
  server.value = next;
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
      text: formatServerInfo(data)
    };
  } catch (err) {
    notify(t('alert.fetchFailed', [err.message || err]));
  } finally {
    loadingInfo.value = false;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function present(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function formatCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : present(value);
}

function formatKeyValueRows(rows) {
  return rows
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => `
      <div class="capability-kv-row">
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value)}</dd>
      </div>
    `)
    .join('');
}

function formatInfoCard(title, rows) {
  return `
    <section class="capability-card">
      <div class="capability-card-title">${escapeHtml(title)}</div>
      <dl class="capability-kv-list">${formatKeyValueRows(rows)}</dl>
    </section>
  `;
}

function formatInventoryMetric(label, value) {
  return `
    <div class="capability-metric">
      <div class="capability-metric-label">${escapeHtml(label)}</div>
      <div class="capability-metric-value">${escapeHtml(formatCount(value))}</div>
    </div>
  `;
}

function formatDecoderItem(item) {
  const meta = [
    item.idScheme,
    item.priority !== undefined ? `P${item.priority}` : ''
  ].filter(Boolean).join(' · ');
  return `
    <div class="capability-list-item">
      <span>${escapeHtml(item.id || '-')}</span>
      ${meta ? `<em>${escapeHtml(meta)}</em>` : ''}
    </div>
  `;
}

function formatDecoderGroup(key, title, items = []) {
  const list = Array.isArray(items) ? items : [];
  const expanded = Boolean(expandedDecoderGroups.value[key]);
  const visible = expanded ? list : list.slice(0, 4);
  const hiddenCount = Math.max(0, list.length - visible.length);
  return `
    <div class="capability-list-group">
      <div class="capability-list-title">
        <span>${escapeHtml(title)}</span>
        <em>${escapeHtml(formatCount(list.length))}</em>
      </div>
      <div class="capability-list">
        ${visible.length ? visible.map(formatDecoderItem).join('') : '-'}
        ${list.length > 8 ? `
          <button class="capability-list-more" type="button" data-decoder-group="${escapeAttr(key)}">
            ${expanded
              ? escapeHtml(t('settings.capabilityInfo.collapse'))
              : escapeHtml(t('settings.capabilityInfo.more', [formatCount(hiddenCount)]))}
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function formatCapabilityTitle(item) {
  const name = item.name || '';
  if (name === 'part.decode') return t('settings.capabilityInfo.partDecode');
  if (name === 'part.search') return t('settings.capabilityInfo.partSearch');
  if (name === 'identifier.decode.nand.flash_id') return t('settings.capabilityInfo.flashIdDecode');
  if (name === 'identifier.search.nand.flash_id') return t('settings.capabilityInfo.flashIdSearch');
  if (name === 'marking.lookup.micron.fbga') return t('settings.capabilityInfo.micronFbgaLookup');
  return name || item.operation || '-';
}

function formatSupportLine(label, values = []) {
  const items = values.filter(Boolean);
  if (!items.length) return '';
  return `
    <div class="capability-support-row">
      <span>${escapeHtml(label)}</span>
      <div class="capability-tags">${items.map(item => `<code>${escapeAttr(item)}</code>`).join('')}</div>
    </div>
  `;
}

function formatCapability(item) {
  return `
    <div class="capability-op">
      <div class="capability-op-head">
        <strong>${escapeHtml(formatCapabilityTitle(item))}</strong>
        ${item.operation ? `<span>${escapeHtml(item.operation)}</span>` : ''}
      </div>
      <div class="capability-support">
        ${formatSupportLine(t('settings.capabilityInfo.domain'), item.domains || [])}
        ${formatSupportLine(t('settings.capabilityInfo.chipKind'), item.chipKinds || [])}
        ${formatSupportLine(t('settings.capabilityInfo.productType'), item.productTypes || [])}
        ${formatSupportLine(t('settings.capabilityInfo.idScheme'), item.idSchemes || [])}
      </div>
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
    </div>
  `;
}

function formatServerInfo(data) {
  if (data?.schemaVersion === 'fdnext.capabilities.v1') {
    return formatFdnextCapabilities(data);
  }
  return escapeHtml(JSON.stringify(data, null, 2)).replace(/\n/g, '<br/>');
}

function formatFdnextCapabilities(data) {
  const inventory = data.inventory || {};
  const partNumbers = inventory.partNumbers || {};
  const micronFbga = inventory.micronFbga || {};
  const decoders = data.decoders || {};
  const capabilities = Array.isArray(data.capabilities) ? data.capabilities : [];

  return `
    <div class="capability-info">
      <div class="capability-card-grid">
        ${formatInfoCard(t('settings.capabilityInfo.parser'), [
          [t('settings.capabilityInfo.name'), data.server?.name],
          [t('settings.capabilityInfo.version'), data.server?.version || embeddedParserVersion],
          [t('settings.capabilityInfo.schema'), data.schemaVersion]
        ])}
        ${formatInfoCard(t('settings.capabilityInfo.database'), [
          [t('settings.capabilityInfo.name'), data.fdb?.name],
          [t('settings.capabilityInfo.version'), data.fdb?.version],
          [t('settings.capabilityInfo.generated'), data.fdb?.time],
          [t('settings.capabilityInfo.website'), data.fdb?.website]
        ])}
      </div>
      <section class="capability-card">
        <div class="capability-card-title">${escapeHtml(t('settings.capabilityInfo.inventory'))}</div>
        <div class="capability-metric-grid">
          ${formatInventoryMetric(t('settings.capabilityInfo.controllers'), inventory.controllers?.count)}
          ${formatInventoryMetric(t('settings.capabilityInfo.flashIds'), inventory.flashIds?.count)}
          ${formatInventoryMetric(t('settings.capabilityInfo.partNumbers'), partNumbers.total)}
          ${formatInventoryMetric(t('settings.capabilityInfo.fdbPartNumbers'), partNumbers.fdb)}
          ${formatInventoryMetric(t('settings.capabilityInfo.managedNand'), partNumbers.managedNand)}
          ${formatInventoryMetric(t('settings.capabilityInfo.dram'), partNumbers.dram)}
          ${formatInventoryMetric(t('settings.capabilityInfo.micronFbga'), micronFbga.total)}
          ${formatInventoryMetric(t('settings.capabilityInfo.dramLookup'), micronFbga.dramLookup)}
        </div>
      </section>
      <section class="capability-card">
        <div class="capability-card-title">${escapeHtml(t('settings.capabilityInfo.capabilities'))}</div>
        <div class="capability-op-list">${capabilities.length ? capabilities.map(formatCapability).join('') : '-'}</div>
      </section>
      <section class="capability-card">
        <div class="capability-card-title">${escapeHtml(t('settings.capabilityInfo.decoders'))}</div>
        <div class="capability-list-grid">
          ${formatDecoderGroup('partNumber', t('settings.capabilityInfo.partNumberDecoders'), decoders.partNumber)}
          ${formatDecoderGroup('identifier', t('settings.capabilityInfo.identifierDecoders'), decoders.identifier)}
        </div>
      </section>
    </div>
  `;
}

function handleServerInfoClick(event) {
  const toggle = event.target?.closest?.('[data-decoder-group]');
  if (!toggle || !dialog.value.data) return;
  const group = toggle.getAttribute('data-decoder-group');
  expandedDecoderGroups.value = {
    ...expandedDecoderGroups.value,
    [group]: !expandedDecoderGroups.value[group]
  };
  dialog.value = {
    ...dialog.value,
    text: formatServerInfo(dialog.value.data)
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
