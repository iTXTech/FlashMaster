<template>
  <div v-if="isFdnextCapabilities" class="capability-info">
    <div class="capability-tabs" role="tablist" :aria-label="t('settings.fdServerInfo')">
      <button
        v-for="(tab, index) in tabs" :id="`${instanceId}-tab-${tab.id}`" :key="tab.id"
        type="button" role="tab" :aria-selected="activeTab === tab.id"
        :aria-controls="`${instanceId}-panel-${tab.id}`" :tabindex="activeTab === tab.id ? 0 : -1"
        @click="activeTab = tab.id" @keydown="navigateTabs($event, index)"
      >{{ tab.label }}</button>
    </div>

    <section
      v-show="activeTab === 'overview'" :id="`${instanceId}-panel-overview`"
      class="capability-overview capability-scroll" role="tabpanel" tabindex="0"
      :aria-labelledby="`${instanceId}-tab-overview`"
    >
      <div class="capability-versions">
        <div v-for="entry in versions" :key="entry.label" class="capability-version">
          <h3>{{ entry.label }} <strong>{{ entry.version }}</strong></h3>
          <div>{{ entry.name }}</div>
        </div>
      </div>
      <section :aria-label="t('settings.capabilityInfo.inventory')" class="capability-metric-grid">
        <div v-for="item in inventoryMetrics" :key="item.id || item.label" class="capability-metric">
          <div class="capability-metric-label">{{ item.label }}</div>
          <div class="capability-metric-value">{{ item.value }}</div>
        </div>
      </section>
      <section class="capability-section">
        <h3>{{ t('settings.capabilityInfo.capabilities') }}</h3>
        <div v-for="(item, index) in capabilities" :key="item.name || index" class="capability-op">
          <div class="capability-op-head">
            <strong>{{ capabilityTitle(item) }}</strong>
            <span v-if="item.operation">{{ item.operation }}</span>
          </div>
          <div class="capability-support">
            <div v-for="row in capabilitySupportRows(item)" :key="row.label" class="capability-support-row">
              <span>{{ row.label }}</span>
              <div class="capability-tags"><span v-for="tag in row.values" :key="tag">{{ tag }}</span></div>
            </div>
          </div>
        </div>
        <p v-if="!capabilities.length" class="capability-empty">{{ t('settings.capabilityInfo.notReported') }}</p>
      </section>
      <details class="capability-details">
        <summary>{{ t('settings.capabilityInfo.details') }}</summary>
        <dl class="capability-kv-list">
          <div v-for="row in detailRows" :key="row.label" class="capability-kv-row">
            <dt>{{ row.label }}</dt>
            <dd>
              <template v-if="row.date">
                <time>{{ formatDate(row.value) }}</time>
                <span class="capability-raw-date">{{ row.value }}</span>
              </template>
              <template v-else>{{ row.value }}</template>
            </dd>
          </div>
        </dl>
      </details>
    </section>

    <section
      v-for="kind in ['controllers', 'decoders']" v-show="activeTab === kind"
      :id="`${instanceId}-panel-${kind}`" :key="kind" class="capability-browser" role="tabpanel"
      :aria-labelledby="`${instanceId}-tab-${kind}`"
    >
      <div class="capability-browser-toolbar">
        <div class="capability-filters">
          <v-select
            v-if="kind === 'controllers'" v-model="controllerGroup" :items="controllerOptions"
            :label="t('settings.capabilityInfo.browseGroup')" hide-details
          />
          <v-select
            v-else v-model="decoderKind" :items="decoderOptions"
            :label="t('settings.capabilityInfo.decoderKind')" hide-details
          />
          <v-text-field
            v-if="kind === 'controllers'" v-model="controllerQuery" clearable hide-details
            :label="t('settings.capabilityInfo.searchControllers')"
          />
          <v-text-field
            v-else v-model="decoderQuery" clearable hide-details
            :label="t('settings.capabilityInfo.searchDecoders')"
          />
        </div>
        <p v-if="kind === 'controllers' && selectedGroup?.description" class="capability-group-description">{{ selectedGroup.description }}</p>
        <div class="capability-list-summary" role="status" aria-live="polite" aria-atomic="true">
          {{ t('settings.capabilityInfo.matching', [formatCount(catalogs[kind].filtered.length), formatCount(catalogs[kind].total)]) }}
          <span v-if="kind === 'controllers' && reportedControllerCount !== catalogs[kind].total">
            · {{ t('settings.capabilityInfo.reportedCount', [formatCount(reportedControllerCount)]) }}
          </span>
        </div>
      </div>
      <div :ref="element => { listElements[kind] = element; }" class="capability-scroll capability-list-content" tabindex="0" :aria-label="tabs.find(tab => tab.id === kind).label">
        <ul v-if="catalogs[kind].filtered.length" :class="kind === 'controllers' ? 'capability-model-list' : 'capability-decoder-list'">
          <li v-for="(item, index) in catalogs[kind].items" :key="index">
            <template v-if="kind === 'controllers'"><span class="data-identifier">{{ item }}</span></template>
            <template v-else>
              <span class="capability-decoder-id data-identifier">{{ item.id || '-' }}</span>
              <span v-if="item.priority != null" class="capability-priority">{{ t('settings.capabilityInfo.priority', [item.priority]) }}</span>
              <span v-if="item.idScheme" class="capability-decoder-scheme">{{ t('settings.capabilityInfo.idScheme') }}: {{ chipLabel(item.idScheme) }}</span>
            </template>
          </li>
        </ul>
        <p v-else class="capability-empty">{{ t(catalogs[kind].total ? 'settings.capabilityInfo.noMatches' : 'settings.capabilityInfo.noItems') }}</p>
      </div>
      <div class="capability-pagination">
        <v-btn variant="text" icon="mdi-chevron-left" :aria-label="t('dashboard.previousPage')" :disabled="catalogs[kind].page <= 1" @click="changePage(kind, -1)" />
        <span>{{ t('dashboard.page', [catalogs[kind].page, catalogs[kind].pageCount]) }}</span>
        <v-btn variant="text" icon="mdi-chevron-right" :aria-label="t('dashboard.nextPage')" :disabled="catalogs[kind].page >= catalogs[kind].pageCount" @click="changePage(kind, 1)" />
      </div>
    </section>
  </div>
  <pre v-else class="capability-json capability-scroll">{{ fallbackText }}</pre>
</template>

<script setup>
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { chipLabel } from '@/services/fdnextResultView';
import { useCapabilityInventory } from '@/composables/useCapabilityInventory';

const props = defineProps({ data: { type: Object, default: () => ({}) } });
const { t, locale } = useI18n();
const instanceId = useId();
const activeTab = ref('overview');
const listElements = {};
const {
  groups, selectedGroup, controllerGroup, controllerQuery, controllerItems, filteredControllers, controllers,
  decoderKind, decoderQuery, decoderItems, filteredDecoders, decoders
} = useCapabilityInventory(() => props.data);
const tabs = computed(() => ['overview', 'controllers', 'decoders'].map(id => ({ id, label: t(`settings.capabilityInfo.${id}`) })));
const isFdnextCapabilities = computed(() => String(props.data?.schemaVersion || '').startsWith('fdnext.capabilities.'));
const capabilities = computed(() => Array.isArray(props.data?.capabilities) ? props.data.capabilities : []);
const fallbackText = computed(() => JSON.stringify(props.data || {}, null, 2));
const versions = computed(() => [
  { label: t('settings.capabilityInfo.parser'), name: props.data.server?.name || '-', version: props.data.server?.version || '-' },
  { label: t('settings.capabilityInfo.database'), name: props.data.fdb?.name || '-', version: props.data.fdb?.version || '-' }
]);
const inventoryMetrics = computed(() => (Array.isArray(props.data?.inventory?.metrics) ? props.data.inventory.metrics : [])
  .filter(item => item && item.count != null)
  .map(item => ({ id: item.id, label: item.label || item.id, value: formatCount(item.count) })));
const controllerOptions = computed(() => {
  const options = groups.value.map(group => ({ title: `${group.title || group.id} (${formatCount(group.count ?? group.items.length)})`, value: group.id }));
  if (!groups.value.some(group => group.id === 'all')) options.unshift({ title: t('settings.capabilityInfo.allControllers'), value: null });
  return options;
});
const reportedControllerCount = computed(() => selectedGroup.value
  ? selectedGroup.value.count ?? selectedGroup.value.items.length
  : props.data.inventory?.controllers?.count ?? controllerItems.value.length);
const decoderOptions = computed(() => [
  { title: t('settings.capabilityInfo.partNumberDecoders'), value: 'partNumber' },
  { title: t('settings.capabilityInfo.identifierDecoders'), value: 'identifier' }
]);
const catalogs = computed(() => ({
  controllers: { total: controllerItems.value.length, filtered: filteredControllers.value, items: controllers.pagedItems.value, page: controllers.page.value, pageCount: controllers.pageCount.value },
  decoders: { total: decoderItems.value.length, filtered: filteredDecoders.value, items: decoders.pagedItems.value, page: decoders.page.value, pageCount: decoders.pageCount.value }
}));
const defaultControllerGroupsLabel = computed(() => {
  const defaults = props.data.inventory?.controllers?.defaultGroups;
  return (defaults === 'all' ? ['all'] : Array.isArray(defaults) ? defaults : [])
    .map(id => groups.value.find(group => group.id === id)?.title || id).join(', ');
});
const detailRows = computed(() => [
  ['commitHash', props.data.server?.build?.commitHash],
  ['buildTime', props.data.server?.build?.buildTime, true],
  ['generated', props.data.fdb?.time, true],
  ['website', props.data.fdb?.website],
  ['defaultControllerGroups', defaultControllerGroupsLabel.value]
].filter(([, value]) => value != null && String(value).trim()).map(([key, value, date]) => ({ label: t(`settings.capabilityInfo.${key}`), value, date })));

watch(() => props.data, () => { activeTab.value = 'overview'; });
watch([filteredControllers, filteredDecoders, () => controllers.page.value, () => decoders.page.value], () => {
  Object.values(listElements).forEach(element => { if (element) element.scrollTop = 0; });
});
function changePage(kind, delta) {
  const paging = kind === 'controllers' ? controllers : decoders;
  paging.page.value = Math.max(1, Math.min(paging.pageCount.value, paging.page.value + delta));
}
function navigateTabs(event, index) {
  const last = tabs.value.length - 1;
  const target = { ArrowRight: (index + 1) % tabs.value.length, ArrowLeft: (index + last) % tabs.value.length, Home: 0, End: last }[event.key];
  if (target === undefined) return;
  event.preventDefault();
  activeTab.value = tabs.value[target].id;
  event.currentTarget.parentElement.children[target].focus();
}
function formatCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString(locale.value === 'chs' ? 'zh-CN' : 'en-US') : String(value ?? '-');
}
function formatDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale.value === 'chs' ? 'zh-CN' : 'en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short', hourCycle: 'h23'
  }).format(date);
}
function capabilityTitle(item) {
  const names = {
    'part.decode': 'partDecode', 'part.search': 'partSearch',
    'identifier.decode.nand.flash_id': 'flashIdDecode', 'identifier.search.nand.flash_id': 'flashIdSearch',
    'marking.lookup.micron.fbga': 'micronFbgaLookup'
  };
  return names[item.name] ? t(`settings.capabilityInfo.${names[item.name]}`) : item.name || item.operation || '-';
}
function capabilitySupportRows(item) {
  const domains = normalizeTextList(item.domains);
  const rows = [
    ['chipKind', item.chipKinds, chipLabel], ['productType', item.productTypes, chipLabel], ['idScheme', item.idSchemes, chipLabel]
  ];
  if (!(domains.length === 1 && domains[0] === 'memory')) rows.unshift(['domain', domains, value => value === 'memory' ? t('settings.capabilityInfo.domainMemory') : value]);
  return rows.map(([key, values, formatter]) => ({ label: t(`settings.capabilityInfo.${key}`), values: normalizeTextList(values).map(formatter).filter(Boolean) }))
    .filter(row => row.values.length);
}
function normalizeTextList(values) {
  return Array.isArray(values) ? values.filter(Boolean) : [];
}
</script>
