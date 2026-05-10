<template>
  <div class="workspace workspace--about">
    <div class="workspace-grid single">
      <section class="panel about-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('nav.about') }}</div>
          </div>
          <v-btn variant="tonal" prepend-icon="mdi-history" @click="openChangelog">{{ $t('changelog.title') }}</v-btn>
        </div>
        <div class="panel-body">
          <div class="about-copy text-body-2" v-html="$t('about', [client, fdnextVersion])" />
        </div>
      </section>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getEmbeddedVersion } from '@/services/versionInfo';
import bus from '@/store/bus';

const fdnextVersion = getEmbeddedVersion();

const client = computed(() => {
  const ua = navigator.userAgent;
  let temp;
  let match = ua.match(/(flashmasterios|flashmasterandroid|opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*([.\d]+)/i) || [];
  if (/trident/i.test(match[1])) {
    temp = /\brv[ :]+(\d+)/g.exec(ua) || [];
    return `IE ${temp[1] || ''}`;
  }
  if (match[1] === 'Chrome') {
    temp = ua.match(/\b(OPR|Edge)\/([.\d]+)/i);
    if (temp) {
      return `${temp[1].replace('OPR', 'Opera')} ${temp[2]}`;
    }
  }
  match = match[2] ? [match[1], match[2]] : [navigator.appName, navigator.appVersion, '-?'];
  temp = ua.match(/version\/([.\d]+)/i);
  if (temp) {
    match.splice(1, 1, temp[1]);
  }
  return `${match[0]} ${match[1]}`;
});

function openChangelog() {
  bus.emit('changelog');
}
</script>

<style scoped>
.about-panel {
  width: min(100%, 720px);
  justify-self: center;
}

.about-copy {
  color: rgba(var(--v-theme-on-surface), 0.88);
  line-height: 1.65;
}

.about-copy :deep(a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.about-copy :deep(a:hover) {
  text-decoration: underline;
}

.about-copy :deep(.about-section) {
  margin-top: 14px;
}

.about-copy :deep(.about-section:first-child) {
  margin-top: 0;
}

.about-copy :deep(.about-heading) {
  margin-bottom: 4px;
  color: rgb(var(--v-theme-on-surface));
  font-weight: 700;
}

.about-copy :deep(.about-meta) {
  color: rgba(var(--v-theme-on-surface), 0.68);
}
</style>
