<template>
  <div class="decode-specification">
    <section v-for="block in blocks" :key="block.id" class="spec-group">
      <div class="spec-group-header">
        <h3>{{ block.label }}</h3>
        <v-btn icon size="small" density="comfortable" variant="text" :aria-label="t('dashboard.copySection', [block.label])" @click="emit('copy-block', block)">
          <v-icon icon="mdi-content-copy" size="18" />
        </v-btn>
      </div>
      <ExpandableListCell
        v-if="block.rows.length === 1 && block.rows[0].items.length && block.rows[0].name === block.label"
        class="metric-expandable-list spec-controller-list"
        :items="block.rows[0].items"
        fill-row
        :preview-rows="2"
      />
      <SpecificationFields v-else :rows="block.rows" :compact-labels="block.id === 'dram' || chipKind === 'dram'" />
    </section>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import ExpandableListCell from '@/components/ExpandableListCell.vue';
import SpecificationFields from '@/components/SpecificationFields.vue';

defineProps({ blocks: { type: Array, default: () => [] }, chipKind: { type: String, default: '' } });
const emit = defineEmits(['copy-block']);
const { t } = useI18n();
</script>
