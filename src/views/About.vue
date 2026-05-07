<template>
  <div class="workspace">
    <div class="workspace-grid single">
      <section class="panel about-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('nav.about') }}</div>
          </div>
        </div>
        <div class="panel-body">
          <p class="text-body-2" v-html="$t('about', [client])" />
        </div>
      </section>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

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
</script>

<style scoped>
.about-panel {
  width: min(100%, 720px);
  justify-self: center;
}
</style>
