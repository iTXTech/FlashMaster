<template>
  <dl ref="fields" class="spec-fields">
    <div v-for="row in displayRows" :key="row.key" class="spec-field" :class="{ 'spec-field--long': row.long, 'spec-field--mobile-long': row.mobileLong, 'spec-field--list': row.items?.length }">
      <dt :title="row.help ? undefined : row.name">
        <v-menu v-if="row.help" open-on-hover open-on-focus open-on-click location="top">
          <template #activator="{ props: helpProps }">
            <button v-bind="helpProps" type="button" class="spec-field-help">{{ row.label }}</button>
          </template>
          <div class="spec-field-help-content" role="note">{{ row.help }}</div>
        </v-menu>
        <template v-else>{{ row.label }}</template>
      </dt>
      <dd :class="{ 'data-identifier': row.isIdentifier && !row.items?.length }">
        <ExpandableListCell v-if="row.items?.length" class="metric-expandable-list spec-controller-list" :items="row.items" fill-row :preview-rows="2" />
        <span v-else>{{ row.value }}</span>
      </dd>
    </div>
  </dl>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ExpandableListCell from '@/components/ExpandableListCell.vue';
import { useSpecificationColumns } from '@/composables/useSpecificationColumns';
import { specificationRows } from '@/services/fdnextResultView';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  compactLabels: { type: Boolean, default: false }
});
const { t } = useI18n();
const displayRows = computed(() => specificationRows(props.rows, { compactLabels: props.compactLabels }).map(row => ({
  ...row,
  help: row.key === 'marking_year_digit' ? t('dashboard.markingYearHelp') : ''
})));
const fields = ref(null);
useSpecificationColumns(fields, displayRows);
</script>
