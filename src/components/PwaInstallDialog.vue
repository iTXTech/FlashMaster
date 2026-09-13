<template>
  <v-dialog :model-value="state.dialog" max-width="480" aria-labelledby="install-dialog-title" @update:model-value="value => !value && closeGuide()">
    <section class="panel install-guide">
      <div class="panel-header">
        <div id="install-dialog-title" class="panel-title">{{ title }}</div>
        <v-btn icon="mdi-close" variant="text" :aria-label="$t('close')" @click="closeGuide" />
      </div>
      <div class="panel-body install-guide-body">
        <p v-if="state.failed" role="status">{{ $t('install.failed') }}</p>
        <p>{{ $t('install.benefit') }}</p>
        <ol class="install-guide-steps">
          <li v-for="(step, index) in steps" :key="index">{{ step }}</li>
        </ol>
        <p v-if="state.guide === 'ios'" class="install-guide-note">{{ $t('install.iosMissing') }}</p>
        <p v-if="state.secureContext" class="install-guide-note">{{ $t('install.offline') }}</p>
        <a :href="helpUrl" target="_blank" rel="noopener noreferrer">{{ $t('install.browserHelp') }}</a>
      </div>
      <div class="install-guide-actions">
        <v-btn v-if="state.canPrompt" color="primary" :loading="state.busy" @click="install">{{ title }}</v-btn>
        <v-btn variant="text" @click="closeGuide">{{ $t('close') }}</v-btn>
      </div>
    </section>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePwaInstall } from '@/composables/usePwaInstall';

const { tm, locale } = useI18n();
const { state, title, install, closeGuide } = usePwaInstall();
const steps = computed(() => tm(`install.steps.${state.guide}`));
const helpUrl = computed(() => {
  const language = locale.value === 'chs' ? 'zh-cn' : 'en-us';
  if (state.guide === 'ios') return `https://support.apple.com/${language}/guide/iphone/iphea86e5236/ios`;
  if (state.guide === 'macos') return `https://support.apple.com/${language}/104996`;
  return 'https://web.dev/learn/pwa/installation';
});
</script>

<style scoped>
.install-guide { max-height: 85dvh; overflow-y: auto; background: rgb(var(--v-theme-surface)); }
.install-guide-body { display: grid; gap: 14px; line-height: 1.6; overflow-wrap: anywhere; }
.install-guide-body p { margin: 0; }
.install-guide-steps { padding-left: 24px; }
.install-guide-steps li + li { margin-top: 8px; }
.install-guide-note { font-size: 13px; color: rgb(var(--v-theme-on-surface-variant)); }
.install-guide-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; padding: 0 16px 16px; }
</style>
