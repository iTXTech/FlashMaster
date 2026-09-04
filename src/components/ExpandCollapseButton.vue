<template>
  <v-btn
    class="expand-collapse-button"
    density="compact"
    size="x-small"
    variant="text"
    :prepend-icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
    :aria-expanded="expanded"
    @click="emit('toggle')"
  >
    {{ label }}
  </v-btn>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  expanded: {
    type: Boolean,
    default: false
  },
  hiddenCount: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['toggle']);
const { t } = useI18n();

const formattedHiddenCount = computed(() => {
  const count = Number(props.hiddenCount);
  return Number.isFinite(count) ? Math.max(0, count).toLocaleString() : '0';
});
const label = computed(() => props.expanded
  ? t('collapseItems')
  : t('showMoreItems', [formattedHiddenCount.value]));
</script>
