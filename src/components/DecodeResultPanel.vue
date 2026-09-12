<template>
  <section v-if="!loading" class="panel decode-result-panel" :lang="locale === 'eng' ? 'en' : 'zh-CN'">
    <div v-if="status !== 'ok'" class="decode-state" :class="{ 'decode-state--error': error || status === 'invalid_input' }">
      <div role="status" aria-live="polite" aria-atomic="true">
        <h2 class="decode-state-title">{{ stateTitle }}</h2>
        <div v-if="query && !hasContent" class="decode-state-query">
          <span>{{ queryLabel }}:</span> <strong class="data-identifier">{{ query }}</strong>
        </div>
        <p id="decode-state-description" class="decode-state-description">{{ stateDescription }}</p>
        <p v-if="error?.message" class="decode-state-detail">{{ error.message }}</p>
      </div>
      <div v-if="status === 'idle'" class="decode-state-examples">
        <span>{{ t('decodeState.examples') }}</span>
        <button v-for="example in examples" :key="example" type="button" class="decode-example data-identifier" :aria-label="t('decodeState.fillExample', [example])" @click="emit('example', example)">{{ example }}</button>
      </div>
      <div v-else-if="error || (['not_found', 'unsupported'].includes(status) && query)" class="decode-state-actions">
        <v-btn v-if="error" color="primary" variant="tonal" @click="emit('retry', query)">{{ t('decodeState.retry') }}</v-btn>
        <v-btn v-else-if="['not_found', 'unsupported'].includes(status) && query" color="primary" variant="tonal" prepend-icon="mdi-magnify" @click="emit('search', query)">{{ t('decodeState.search') }}</v-btn>
        <v-btn v-if="error?.http" variant="text" :to="settingsRoute(route)">{{ t('decodeState.serverSettings') }}</v-btn>
      </div>
    </div>
    <div v-if="hasContent" class="decode-identity">
      <div v-if="header.vendor" class="decode-vendor">
        <span class="decode-identity-label">{{ t('vendor') }}</span>
        <VendorLogo :vendor="header.vendor"><span class="decode-vendor-name">{{ header.vendor }}</span></VendorLogo>
      </div>
      <div class="decode-identity-copy">
        <div class="decode-title-line">
          <span class="decode-identity-label">{{ queryLabel }}:</span>
          <h3 class="decode-title">{{ header.title }}</h3>
        </div>
        <div class="decode-identity-details">
          <div class="decode-identity-fields">
            <span v-if="header.kind" class="decode-kind" :aria-label="`${t('dashboard.chipType')}: ${header.kind}`">{{ header.kind }}</span>
            <span v-if="header.marking" class="decode-marking">{{ t('dashboard.marking') }}: <strong class="data-identifier">{{ header.marking }}</strong></span>
          </div>
          <div class="decode-copy-actions">
            <v-btn prepend-icon="mdi-content-copy" variant="text" :disabled="!result" :aria-label="t('dashboard.copyFull')" :title="t('dashboard.copyFull')" @click="emit('copy-overview', 'full')">{{ t('dashboard.copySummaryLabel') }}</v-btn>
            <v-menu>
              <template #activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" icon="mdi-chevron-down" variant="text" :disabled="!result" :aria-label="t('dashboard.copyOptions')" />
              </template>
              <v-list density="compact">
                <v-list-item :title="t('dashboard.copyBrief')" @click="emit('copy-overview', 'brief')" />
              </v-list>
            </v-menu>
          </div>
        </div>
      </div>
    </div>
    <template v-if="result">
      <div v-if="warningRows.length" id="decode-warnings" class="warning-list decode-warnings" role="status">
        <div v-for="(item, index) in warningRows" :key="item.code + '-' + index" class="warning-item">{{ item.message }}</div>
      </div>
      <DecodeSpecificationSheet :blocks="blocks" :chip-kind="header.device.chipKind" @copy-block="emit('copy-block', $event)" />
      <section v-if="candidates.length" class="decode-resource-section">
        <h3>{{ t('dashboard.candidates') }} <span class="result-count">{{ candidates.length }}</span></h3>
        <div v-for="(candidate, index) in candidates" :key="index" class="decode-candidate">
          <strong class="data-identifier">{{ deviceTitle(candidate.device) }}</strong>
          <span v-for="field in fieldRows(candidate.fields)" :key="field.key">{{ field.name }}: <span :class="{ 'data-identifier': field.isIdentifier }">{{ field.value }}</span></span>
          <span v-for="(warning, warningIndex) in candidate.warnings" :key="warningIndex" class="warning-item">{{ warning.message || warning.code }}</span>
        </div>
      </section>
      <section v-if="relations.length" class="decode-resource-section">
        <h3>{{ relationsHeading }} <span class="result-count">{{ relations.length }}</span></h3>
        <div class="decode-related-list">
          <component :is="item.route ? 'router-link' : 'div'" v-for="item in relations" :key="item.key" :to="item.route ? localizeRouteLocation(item.route, route) : undefined" :aria-label="item.route ? [item.actionLabel || item.label, item.target || item.value].filter(Boolean).join(' ') : undefined" class="decode-related-record">
            <span v-if="!item.isDecodeNavigation">{{ item.label || item.kind }}</span>
            <strong :class="{ 'data-identifier': item.isIdentifier }">{{ item.target || item.value }}</strong>
            <v-icon v-if="item.route && !item.isDecodeNavigation" icon="mdi-arrow-right" size="14" />
            <span v-for="field in item.fields" :key="field.key">{{ field.name }}: <span :class="{ 'data-identifier': field.isIdentifier }">{{ field.value }}</span></span>
          </component>
        </div>
      </section>
      <section v-if="externalLinks.length" class="decode-resource-section decode-external-resources">
        <h3>{{ t('dashboard.externalLinks') }}</h3>
        <ExternalLinks v-if="resourceLinks.length" :links="resourceLinks" compact />
        <ExternalLinks v-if="advertisements.length" :links="advertisements" compact />
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import DecodeSpecificationSheet from '@/components/DecodeSpecificationSheet.vue';
import ExternalLinks from '@/components/ExternalLinks.vue';
import VendorLogo from '@/components/VendorLogo.vue';
import { decodeResultHasContent, deviceTitle, externalLinkRows, fieldRows, relationRows, resultBlocks, resultHeader, warnings } from '@/services/fdnextResultView';
import { localizeRouteLocation, settingsRoute } from '@/router/locations';

const props = defineProps({
  result: { type: Object, default: null },
  kind: { type: String, required: true },
  loading: { type: Boolean, default: false },
  error: { type: Object, default: null }
});
const emit = defineEmits(['copy-overview', 'copy-block', 'example', 'retry', 'search']);
const { t, locale } = useI18n();
const route = useRoute();
const header = computed(() => resultHeader(props.result));
const hasContent = computed(() => decodeResultHasContent(props.result));
const status = computed(() => props.error?.kind || props.result?.status || 'idle');
const query = computed(() => props.error?.query || props.result?.input?.normalized || props.result?.input?.query || '');
const queryLabel = computed(() => t(props.kind === 'fid' ? 'flashId' : 'partNumber'));
const examples = computed(() => props.kind === 'fid' ? ['2C644432A500'] : ['K9OKGY8S7C-CCK0', '1TA22JZ215', '9SA47D9SWC']);
const stateKey = computed(() => ['idle', 'not_found'].includes(status.value)
  ? `${props.kind}.${status.value}`
  : ['invalid_input', 'unsupported', 'ambiguous', 'request_failed', 'timeout'].includes(status.value) ? status.value : 'unavailable');
const stateTitle = computed(() => t(`decodeState.${stateKey.value}Title`));
const stateDescription = computed(() => t(`decodeState.${stateKey.value}Description`));
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
</script>
