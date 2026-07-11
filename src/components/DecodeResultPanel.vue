<template>
  <section class="panel decode-result-panel">
    <div class="panel-header">
      <div>
        <div class="panel-title">{{ t('dashboard.decodeResult') }}</div>
        <div v-if="meta" class="panel-meta">{{ meta }}</div>
      </div>
      <v-btn icon="mdi-content-copy" variant="text" :disabled="!result" @click="emit('copy-overview')" />
    </div>
    <div class="panel-body">
      <div v-if="result" class="result-stack">
        <div class="result-hero">
          <div class="metric" :class="vendorMetricClass">
            <div class="metric-label">{{ t('vendor') }}</div>
            <VendorLogo :vendor="header.vendor">
              <div class="metric-value">{{ displayValue(header.vendor) }}</div>
            </VendorLogo>
          </div>
          <div class="result-title-panel">
            <div class="result-title">{{ displayValue(header.title) }}</div>
            <div class="result-subtitle">{{ displayValue(header.subtitle) }}</div>
          </div>
        </div>
        <div v-if="warnings.length > 0" class="warning-list">
          <div v-for="item in warnings" :key="item.code" class="warning-item">{{ item.message }}</div>
        </div>
        <MetricGrid :class="metricsClass" :items="metrics" />
      </div>
      <div v-else class="empty-state">{{ t('dashboard.empty') }}</div>
    </div>
  </section>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import MetricGrid from '@/components/MetricGrid.vue';
import VendorLogo from '@/components/VendorLogo.vue';
import { displayValue } from '@/services/display';

defineProps({
  result: {
    type: Object,
    default: null
  },
  header: {
    type: Object,
    required: true
  },
  meta: {
    type: String,
    default: ''
  },
  metrics: {
    type: Array,
    default: () => []
  },
  warnings: {
    type: Array,
    default: () => []
  },
  vendorMetricClass: {
    type: String,
    default: ''
  },
  metricsClass: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['copy-overview']);
const { t } = useI18n();
</script>
