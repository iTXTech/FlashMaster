<template>
  <section class="panel decode-result-panel" :lang="locale === 'eng' ? 'en' : 'zh-CN'">
    <div class="decode-identity">
      <div v-if="result" class="decode-vendor">
        <span class="decode-identity-label">{{ t('vendor') }}</span>
        <VendorLogo :vendor="header.vendor"><span class="decode-vendor-name">{{ header.vendor }}</span></VendorLogo>
      </div>
      <div class="decode-identity-copy">
        <h2 v-if="!result" class="panel-title">{{ t('dashboard.decodeResult') }}</h2>
        <div v-if="result" class="decode-title-line">
          <span class="decode-identity-label">{{ header.device.identifier ? t('flashId') : t('partNumber') }}:</span>
          <h3 class="decode-title">{{ header.title }}</h3>
          <span v-if="header.kind" class="decode-kind" :aria-label="`${t('dashboard.chipType')}: ${header.kind}`">{{ header.kind }}</span>
        </div>
        <div v-if="meta" class="panel-meta">{{ meta }}</div>
        <div v-if="header.marking || originalInput" class="decode-input-identity">
          <span v-if="header.marking">{{ t('dashboard.marking') }}: <strong>{{ header.marking }}</strong></span>
          <span v-if="originalInput">{{ t('dashboard.originalInput') }}: {{ originalInput }}</span>
        </div>
      </div>
      <div class="decode-copy-actions">
        <v-btn prepend-icon="mdi-content-copy" variant="text" :disabled="!result" :aria-label="t('dashboard.copyBrief')" :title="t('dashboard.copyBrief')" @click="emit('copy-overview', 'brief')">{{ t('dashboard.copyBriefLabel') }}</v-btn>
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon="mdi-chevron-down" variant="text" :disabled="!result" :aria-label="t('dashboard.copyOptions')" />
          </template>
          <v-list density="compact">
            <v-list-item :title="t('dashboard.copyFull')" @click="emit('copy-overview', 'full')" />
            <v-list-item :title="t('dashboard.copyTechnicalLinks')" :disabled="!technicalText" @click="emit('copy-resources', technicalText)" />
          </v-list>
        </v-menu>
      </div>
    </div>
    <template v-if="result">
      <div v-if="warningRows.length" class="warning-list decode-warnings" role="status">
        <div v-for="(item, index) in warningRows" :key="item.code + '-' + index" class="warning-item">{{ item.message }}</div>
      </div>
      <DecodeSpecificationSheet :blocks="blocks" :chip-kind="header.device.chipKind" @copy-block="emit('copy-block', $event)" />
      <section v-if="candidates.length" class="decode-resource-section">
        <h3>{{ t('dashboard.candidates') }} <span class="result-count">{{ candidates.length }}</span></h3>
        <div v-for="(candidate, index) in candidates" :key="index" class="decode-candidate">
          <strong>{{ deviceTitle(candidate.device) }}</strong>
          <span v-for="field in fieldRows(candidate.fields)" :key="field.key">{{ field.name }}: {{ field.value }}</span>
          <span v-for="(warning, warningIndex) in candidate.warnings" :key="warningIndex" class="warning-item">{{ warning.message || warning.code }}</span>
        </div>
      </section>
      <section v-if="relations.length" class="decode-resource-section">
        <h3>{{ relationsHeading }} <span class="result-count">{{ relations.length }}</span></h3>
        <div class="decode-related-list">
          <component :is="item.route ? 'router-link' : 'div'" v-for="item in relations" :key="item.key" :to="item.route ? localizeRouteLocation(item.route, route) : undefined" :aria-label="item.route ? [item.actionLabel || item.label, item.target || item.value].filter(Boolean).join(' ') : undefined" class="decode-related-record">
            <span v-if="!item.isDecodeNavigation">{{ item.label || item.kind }}</span>
            <strong>{{ item.target || item.value }}</strong>
            <v-icon v-if="item.route && !item.isDecodeNavigation" icon="mdi-arrow-right" size="14" />
            <span v-for="field in item.fields" :key="field.key">{{ field.name }}: {{ field.value }}</span>
          </component>
        </div>
      </section>
      <section v-if="externalLinks.length" class="decode-resource-section decode-external-resources">
        <div class="spec-group-header">
          <h3>{{ t('dashboard.externalLinks') }}</h3>
          <v-btn v-if="technicalText" size="small" variant="text" @click="emit('copy-resources', technicalText)">{{ t('dashboard.copyTechnicalLinks') }}</v-btn>
        </div>
        <ExternalLinks v-if="resourceLinks.length" :links="resourceLinks" compact />
        <ExternalLinks v-if="advertisements.length" :links="advertisements" compact />
      </section>
    </template>
    <div v-else class="empty-state">{{ t('dashboard.empty') }}</div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import DecodeSpecificationSheet from '@/components/DecodeSpecificationSheet.vue';
import ExternalLinks from '@/components/ExternalLinks.vue';
import VendorLogo from '@/components/VendorLogo.vue';
import { deviceTitle, externalLinkRows, fieldRows, relationRows, resultBlocks, resultHeader, technicalLinksText, warnings } from '@/services/fdnextResultView';
import { localizeRouteLocation } from '@/router/locations';

const props = defineProps({
  result: { type: Object, default: null },
  meta: { type: String, default: '' }
});
const emit = defineEmits(['copy-overview', 'copy-block', 'copy-resources']);
const { t, locale } = useI18n();
const route = useRoute();
const header = computed(() => resultHeader(props.result));
const originalInput = computed(() => ![header.value.title, header.value.marking].includes(header.value.input) ? header.value.input : '');
const blocks = computed(() => resultBlocks(props.result));
const warningRows = computed(() => warnings(props.result));
const candidates = computed(() => props.result?.candidates || []);
const relations = computed(() => relationRows(props.result));
const relationsHeading = computed(() => relations.value.every(item => item.isDefaultNavigation)
  ? t(props.result?.operation === 'part.decode' ? 'dashboard.relatedIds' : 'dashboard.relatedParts')
  : t('dashboard.relatedData'));
const externalLinks = computed(() => externalLinkRows(props.result?.links, header.value.vendor));
const resourceLinks = computed(() => externalLinks.value.filter(link => !link.isAdvertisement));
const advertisements = computed(() => externalLinks.value.filter(link => link.isAdvertisement));
const technicalText = computed(() => technicalLinksText(props.result));
</script>
