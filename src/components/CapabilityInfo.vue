<template>
  <div class="server-info-content">
    <div v-if="isFdnextCapabilities" class="capability-info">
      <div class="capability-card-grid">
        <section class="capability-card">
          <div class="capability-card-title">{{ t('settings.capabilityInfo.parser') }}</div>
          <dl class="capability-kv-list">
            <div v-for="row in parserRows" :key="row.label" class="capability-kv-row">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </dl>
        </section>

        <section class="capability-card">
          <div class="capability-card-title">{{ t('settings.capabilityInfo.database') }}</div>
          <dl class="capability-kv-list">
            <div v-for="row in databaseRows" :key="row.label" class="capability-kv-row">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section class="capability-card">
        <div class="capability-card-title">{{ t('settings.capabilityInfo.inventory') }}</div>
        <div class="capability-metric-grid">
          <div v-for="item in inventoryMetrics" :key="item.label" class="capability-metric">
            <div class="capability-metric-label">{{ item.label }}</div>
            <div class="capability-metric-value">{{ item.value }}</div>
          </div>
        </div>
      </section>

      <section v-if="hasControllerInventory" class="capability-card">
        <div class="capability-card-title">{{ t('settings.capabilityInfo.controllerInventory') }}</div>
        <dl v-if="defaultControllerGroupsLabel" class="capability-kv-list capability-controller-defaults">
          <div class="capability-kv-row">
            <dt>{{ t('settings.capabilityInfo.defaultControllerGroups') }}</dt>
            <dd>{{ defaultControllerGroupsLabel }}</dd>
          </div>
        </dl>

        <div v-if="controllerGroups.length" class="capability-list-grid capability-controller-grid">
          <div
            v-for="group in controllerGroups"
            :key="controllerExpansionKey(group)"
            class="capability-controller-group"
            :class="{ 'capability-controller-group--expanded': isExpanded(controllerExpansionKey(group)) }"
          >
            <div class="capability-controller-group-head">
              <strong>{{ controllerGroupTitle(group) }}</strong>
              <span>{{ formatCount(controllerCount(group)) }}</span>
            </div>
            <div v-if="group.description" class="capability-controller-group-description">{{ group.description }}</div>
            <div class="capability-controller-chip-grid">
              <span v-for="item in visibleControllerItems(group)" :key="item" class="capability-controller-chip">{{ item }}</span>
              <span v-if="!controllerItemsFor(group).length" class="capability-controller-chip">-</span>
            </div>
            <button
              v-if="canExpandControllerGroup(group)"
              class="capability-list-more"
              type="button"
              @click="toggleExpansion(controllerExpansionKey(group))"
            >
              {{ expansionLabel(controllerExpansionKey(group), controllerHiddenCount(group)) }}
            </button>
          </div>
        </div>

        <div v-else class="capability-list-grid">
          <div
            class="capability-list-group"
            :class="{ 'capability-list-group--expanded': isExpanded('controller:all') }"
          >
            <div class="capability-list-title">
              <span>all</span>
              <em>{{ formatCount(controllerItems.length) }}</em>
            </div>
            <div class="capability-list">
              <div v-for="item in visibleFlatControllerItems" :key="item" class="capability-list-item">
                <span>{{ item }}</span>
              </div>
              <button
                v-if="controllerItems.length > flatControllerLimit"
                class="capability-list-more"
                type="button"
                @click="toggleExpansion('controller:all')"
              >
                {{ expansionLabel('controller:all', hiddenItemCount(controllerItems, 'controller:all', flatControllerLimit)) }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="capability-card">
        <div class="capability-card-title">{{ t('settings.capabilityInfo.capabilities') }}</div>
        <div class="capability-op-list">
          <div v-for="(item, index) in capabilities" :key="item.name || item.operation || index" class="capability-op">
            <div class="capability-op-head">
              <strong>{{ capabilityTitle(item) }}</strong>
              <span v-if="item.operation">{{ item.operation }}</span>
            </div>
            <div class="capability-support">
              <div v-for="row in capabilitySupportRows(item)" :key="row.label" class="capability-support-row">
                <span>{{ row.label }}</span>
                <div class="capability-tags">
                  <code v-for="tag in row.values" :key="tag">{{ tag }}</code>
                </div>
              </div>
            </div>
            <p v-if="item.description">{{ item.description }}</p>
          </div>
          <div v-if="!capabilities.length">-</div>
        </div>
      </section>

      <section class="capability-card">
        <div class="capability-card-title">{{ t('settings.capabilityInfo.decoders') }}</div>
        <div class="capability-list-grid">
          <div
            v-for="group in decoderGroups"
            :key="group.key"
            class="capability-list-group"
            :class="{ 'capability-list-group--expanded': isExpanded(group.key) }"
          >
            <div class="capability-list-title">
              <span>{{ group.title }}</span>
              <em>{{ formatCount(group.items.length) }}</em>
            </div>
            <div class="capability-list">
              <div v-for="item in visibleDecoderItems(group)" :key="decoderLabel(item)" class="capability-list-item">
                <span>{{ decoderLabel(item) }}</span>
                <em v-if="decoderMeta(item)">{{ decoderMeta(item) }}</em>
              </div>
              <div v-if="!group.items.length">-</div>
              <button
                v-if="group.items.length > decoderLimit"
                class="capability-list-more"
                type="button"
                @click="toggleExpansion(group.key)"
              >
                {{ expansionLabel(group.key, hiddenItemCount(group.items, group.key, decoderLimit)) }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <pre v-else class="capability-json">{{ fallbackText }}</pre>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { chipLabel } from '@/services/fdnextResultView';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  selectedControllerGroups: {
    type: Array,
    default: () => []
  }
});

const { t } = useI18n();
const expandedGroups = ref({});
const decoderLimit = 4;
const controllerLimit = 10;
const flatControllerLimit = 24;

const isFdnextCapabilities = computed(() => String(props.data?.schemaVersion || '').startsWith('fdnext.capabilities.'));
const inventory = computed(() => props.data?.inventory || {});
const partNumbers = computed(() => inventory.value.partNumbers || {});
const micronFbga = computed(() => inventory.value.micronFbga || {});
const controllers = computed(() => inventory.value.controllers || {});
const decoders = computed(() => props.data?.decoders || {});
const capabilities = computed(() => Array.isArray(props.data?.capabilities) ? props.data.capabilities : []);

const parserRows = computed(() => keyValueRows([
  [t('settings.capabilityInfo.name'), props.data.server?.name],
  [t('settings.capabilityInfo.version'), props.data.server?.version],
  [t('settings.capabilityInfo.commitHash'), props.data.server?.build?.commitHash],
  [t('settings.capabilityInfo.buildTime'), props.data.server?.build?.buildTime],
  [t('settings.capabilityInfo.selectedControllerGroups'), selectedControllerGroupsLabel.value],
  [t('settings.capabilityInfo.schema'), props.data.schemaVersion]
]));

const databaseRows = computed(() => keyValueRows([
  [t('settings.capabilityInfo.name'), props.data.fdb?.name],
  [t('settings.capabilityInfo.version'), props.data.fdb?.version],
  [t('settings.capabilityInfo.generated'), props.data.fdb?.time],
  [t('settings.capabilityInfo.website'), props.data.fdb?.website]
]));

const inventoryMetrics = computed(() => [
  [t('settings.capabilityInfo.controllers'), controllers.value.count],
  [t('settings.capabilityInfo.flashIds'), inventory.value.flashIds?.count],
  [t('settings.capabilityInfo.partNumbers'), partNumbers.value.total],
  [t('settings.capabilityInfo.fdbPartNumbers'), partNumbers.value.fdb],
  [t('settings.capabilityInfo.managedNand'), partNumbers.value.managedNand],
  [t('settings.capabilityInfo.dram'), partNumbers.value.dram],
  [t('settings.capabilityInfo.micronFbga'), micronFbga.value.total],
  [t('settings.capabilityInfo.dramLookup'), micronFbga.value.dramLookup]
].map(([label, value]) => ({ label, value: formatCount(value) })));

const controllerGroups = computed(() => Array.isArray(controllers.value.groups)
  ? controllers.value.groups.filter(group => group && typeof group === 'object')
  : []);
const controllerItems = computed(() => normalizeControllerItems(controllers.value.items).sort((a, b) => a.localeCompare(b)));
const hasControllerInventory = computed(() => controllerGroups.value.length > 0 || controllerItems.value.length > 0);
const defaultControllerGroupsLabel = computed(() => formatControllerGroupSelection(controllers.value.defaultGroups));
const selectedControllerGroupsLabel = computed(() => formatSelectedControllerGroups(props.selectedControllerGroups));
const visibleFlatControllerItems = computed(() => visibleItems(controllerItems.value, 'controller:all', flatControllerLimit));

const decoderGroups = computed(() => [
  {
    key: 'decoder:partNumber',
    title: t('settings.capabilityInfo.partNumberDecoders'),
    items: Array.isArray(decoders.value.partNumber) ? decoders.value.partNumber : []
  },
  {
    key: 'decoder:identifier',
    title: t('settings.capabilityInfo.identifierDecoders'),
    items: Array.isArray(decoders.value.identifier) ? decoders.value.identifier : []
  }
]);

const fallbackText = computed(() => JSON.stringify(props.data || {}, null, 2));

function keyValueRows(rows) {
  return rows
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => ({ label, value: present(value) }));
}

function present(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function formatCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : present(value);
}

function isExpanded(key) {
  return Boolean(expandedGroups.value[key]);
}

function toggleExpansion(key) {
  expandedGroups.value = {
    ...expandedGroups.value,
    [key]: !expandedGroups.value[key]
  };
}

function visibleItems(items, key, limit) {
  const list = Array.isArray(items) ? items : [];
  return isExpanded(key) ? list : list.slice(0, limit);
}

function hiddenItemCount(items, key, limit, count = items.length) {
  return Math.max(0, count - visibleItems(items, key, limit).length);
}

function expansionLabel(key, hiddenCount) {
  return isExpanded(key)
    ? t('settings.capabilityInfo.collapse')
    : t('settings.capabilityInfo.more', [formatCount(hiddenCount)]);
}

function controllerGroupTitle(group) {
  if (group && typeof group === 'object') {
    return present(group.title || group.id);
  }
  return present(group);
}

function findControllerGroup(id) {
  return controllerGroups.value.find(group => group?.id === id);
}

function formatControllerGroupSelection(value) {
  if (value === 'all') return controllerGroupTitle(findControllerGroup('all') || 'all');
  const groups = Array.isArray(value) ? value : [];
  return groups.length
    ? groups.map(item => controllerGroupTitle(findControllerGroup(item) || item)).join(', ')
    : '';
}

function formatSelectedControllerGroups(selection) {
  if (!Array.isArray(selection) || !selection.length || selection.includes('all')) {
    return controllerGroupTitle(findControllerGroup('all') || 'all');
  }
  return selection.map(item => controllerGroupTitle(findControllerGroup(item) || item)).join(', ');
}

function normalizeControllerItems(items = []) {
  return Array.isArray(items)
    ? items.map(item => String(item ?? '').trim()).filter(Boolean)
    : [];
}

function controllerExpansionKey(group) {
  return `controller:${String(group?.id || controllerGroupTitle(group))}`;
}

function controllerItemsFor(group) {
  return normalizeControllerItems(group?.items);
}

function controllerCount(group) {
  const count = Number(group?.count);
  return Number.isFinite(count) ? count : controllerItemsFor(group).length;
}

function visibleControllerItems(group) {
  return visibleItems(controllerItemsFor(group), controllerExpansionKey(group), controllerLimit);
}

function controllerHiddenCount(group) {
  return hiddenItemCount(controllerItemsFor(group), controllerExpansionKey(group), controllerLimit, controllerCount(group));
}

function canExpandControllerGroup(group) {
  return controllerItemsFor(group).length > controllerLimit;
}

function decoderLabel(item) {
  return item?.id || '-';
}

function decoderMeta(item) {
  return item?.priority !== undefined ? `P${item.priority}` : '';
}

function visibleDecoderItems(group) {
  return visibleItems(group.items, group.key, decoderLimit);
}

function capabilityTitle(item) {
  const name = item.name || '';
  if (name === 'part.decode') return t('settings.capabilityInfo.partDecode');
  if (name === 'part.search') return t('settings.capabilityInfo.partSearch');
  if (name === 'identifier.decode.nand.flash_id') return t('settings.capabilityInfo.flashIdDecode');
  if (name === 'identifier.search.nand.flash_id') return t('settings.capabilityInfo.flashIdSearch');
  if (name === 'marking.lookup.micron.fbga') return t('settings.capabilityInfo.micronFbgaLookup');
  return name || item.operation || '-';
}

function capabilitySupportRows(item) {
  return [
    [t('settings.capabilityInfo.domain'), item.domains || [], value => value],
    [t('settings.capabilityInfo.chipKind'), item.chipKinds || [], chipLabel],
    [t('settings.capabilityInfo.productType'), item.productTypes || [], chipLabel],
    [t('settings.capabilityInfo.idScheme'), item.idSchemes || [], chipLabel]
  ]
    .map(([label, values, formatter]) => ({
      label,
      values: normalizeTextList(values).map(formatter).filter(Boolean)
    }))
    .filter(row => row.values.length > 0);
}

function normalizeTextList(values) {
  return Array.isArray(values) ? values.filter(Boolean) : [];
}
</script>
