<template>
  <div class="expandable-cell-list" :class="{ 'expandable-cell-list--expanded': expanded }">
    <component
      :is="clickable ? 'button' : 'div'"
      v-for="item in visibleItems"
      :key="item"
      class="expandable-cell-item"
      :class="{ 'expandable-cell-item--button': clickable }"
      type="button"
      @click="selectItem(item)"
    >
      <span>{{ item }}</span>
    </component>
    <v-btn
      v-if="hasMore"
      class="expandable-cell-toggle"
      density="compact"
      size="x-small"
      variant="text"
      :prepend-icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
      @click="expanded = !expanded"
    >
      {{ toggleLabel }}
    </v-btn>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  limit: {
    type: Number,
    default: 2
  },
  clickable: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['select']);
const { t } = useI18n();
const expanded = ref(false);

const normalizedItems = computed(() => props.items.map(item => String(item || '').trim()).filter(Boolean));
const visibleItems = computed(() => expanded.value ? normalizedItems.value : normalizedItems.value.slice(0, props.limit));
const hiddenCount = computed(() => Math.max(0, normalizedItems.value.length - props.limit));
const hasMore = computed(() => normalizedItems.value.length > props.limit);
const toggleLabel = computed(() => expanded.value ? t('collapseItems') : t('showMoreItems', [hiddenCount.value]));

function selectItem(item) {
  if (props.clickable) emit('select', item);
}

watch(normalizedItems, () => {
  expanded.value = false;
});
</script>
