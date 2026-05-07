<template>
  <v-dialog :model-value="modelValue" max-width="680" @update:model-value="updateVisible">
    <section class="panel changelog-panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">{{ $t('changelog.title') }}</div>
          <div class="panel-meta">{{ $t('changelog.subtitle', [appVersion]) }}</div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="close" />
      </div>

      <div class="panel-body changelog-body">
        <div class="changelog-meta">
          <v-chip size="small" color="primary" variant="tonal">{{ $t('changelog.appVersion', [appVersion]) }}</v-chip>
          <v-chip size="small" color="primary" variant="tonal">{{ $t('changelog.fdnextVersion', [fdnextVersion]) }}</v-chip>
        </div>

        <div class="changelog-text" role="document" tabindex="0">{{ changelogContent }}</div>
      </div>

      <div class="changelog-actions">
        <v-btn color="primary" prepend-icon="mdi-check" @click="close">{{ $t('changelog.gotIt') }}</v-btn>
      </div>
    </section>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getEmbeddedVersion } from '@/services/versionInfo';

defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  appVersion: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);
const { tm } = useI18n();
const fdnextVersion = getEmbeddedVersion();
const changelogContent = computed(() => String(tm('changelog.content') || ''));

function updateVisible(value) {
  emit('update:modelValue', value);
}

function close() {
  updateVisible(false);
}
</script>

<style scoped>
.changelog-panel {
  overflow: hidden;
}

.changelog-body {
  display: grid;
  gap: 12px;
}

.changelog-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.changelog-text {
  max-height: min(34vh, 260px);
  overflow-y: auto;
  padding: 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 6px;
  background: rgba(var(--v-theme-surface-variant), 0.34);
  color: rgba(var(--v-theme-on-surface), 0.82);
  font-size: 0.86rem;
  line-height: 1.6;
  outline: none;
  white-space: pre-wrap;
}

.changelog-text:focus-visible {
  border-color: rgba(var(--v-theme-primary), 0.7);
}

.changelog-actions {
  display: flex;
  justify-content: flex-end;
  padding: 8px 10px 10px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
</style>
