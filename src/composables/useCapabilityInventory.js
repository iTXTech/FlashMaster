import { computed, ref, watch } from 'vue';
import { usePagedItems } from './usePagedItems.js';

const list = value => Array.isArray(value) ? value : [];
const models = value => [...new Set(list(value).map(item => String(item ?? '').trim()).filter(Boolean))];
const matches = (value, query) => String(value ?? '').toLowerCase().includes(String(query ?? '').trim().toLowerCase());

// Browsing capabilities is local to the dialog; it never changes query settings.
export function useCapabilityInventory(data) {
  const controllerGroup = ref(null);
  const controllerQuery = ref('');
  const decoderKind = ref('partNumber');
  const decoderQuery = ref('');
  const groups = computed(() => list(data()?.inventory?.controllers?.groups)
    .filter(group => group && typeof group === 'object')
    .map(group => ({ ...group, items: models(group.items) })));
  const allControllers = computed(() => models([
    ...list(data()?.inventory?.controllers?.items),
    ...groups.value.flatMap(group => group.items)
  ]));
  const selectedGroup = computed(() => groups.value.find(group => group.id === controllerGroup.value));
  const controllerItems = computed(() => selectedGroup.value?.items ?? allControllers.value);
  const filteredControllers = computed(() => controllerItems.value.filter(item => matches(item, controllerQuery.value)));
  const decoderItems = computed(() => list(data()?.decoders?.[decoderKind.value]).filter(item => item && typeof item === 'object'));
  const filteredDecoders = computed(() => decoderItems.value.filter(item =>
    matches([item.id, item.idScheme, item.priority].filter(value => value != null).join(' '), decoderQuery.value)));
  const controllers = usePagedItems(() => filteredControllers.value, 24);
  const decoders = usePagedItems(() => filteredDecoders.value, 20);

  watch(data, () => {
    controllerGroup.value = groups.value.some(group => group.id === 'all') ? 'all' : null;
    controllerQuery.value = '';
    decoderKind.value = 'partNumber';
    decoderQuery.value = '';
  }, { immediate: true, flush: 'sync' });

  return {
    groups, selectedGroup, allControllers, controllerGroup, controllerQuery,
    controllerItems, filteredControllers, controllers,
    decoderKind, decoderQuery, decoderItems, filteredDecoders, decoders
  };
}
