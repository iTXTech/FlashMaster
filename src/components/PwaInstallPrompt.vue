<template>
  <section v-if="state.promotionVisible" ref="banner" class="service-banner install-promotion" aria-labelledby="install-promotion-title">
    <v-icon icon="mdi-download" color="primary" size="20" aria-hidden="true" />
    <div id="install-promotion-title" class="install-promotion-title">{{ title }}</div>
    <div class="install-promotion-actions">
      <v-btn color="primary" variant="tonal" size="small" @click="install">{{ nativeOnly || state.canPrompt ? $t('install.add') : action }}</v-btn>
      <v-btn variant="text" size="small" @click="dismiss">{{ $t('install.later') }}</v-btn>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { usePwaInstall } from '@/composables/usePwaInstall';

const emit = defineEmits(['resize']);
const { state, title, action, nativeOnly, install, dismiss, schedulePromotion } = usePwaInstall();
const banner = ref(null);
let cancelPromotion;

onMounted(() => { cancelPromotion = schedulePromotion(); });
onUnmounted(() => cancelPromotion?.());

watch(banner, (element, _, cleanup) => {
  if (!element) return;
  const measure = () => emit('resize', Math.ceil(element.getBoundingClientRect().height));
  const observer = new ResizeObserver(measure);
  observer.observe(element);
  measure();
  cleanup(() => observer.disconnect());
}, { flush: 'post' });
</script>

<style scoped>
.install-promotion { grid-template-columns: 20px minmax(0, 1fr) auto; padding: 8px 10px; gap: 6px 8px; }
.install-promotion-title { font-size: 14px; font-weight: 600; }
.install-promotion-actions { display: flex; justify-content: flex-end; gap: 4px; }
.install-promotion-actions .v-btn { min-height: 32px; }
@media (max-width: 600px) {
  .install-promotion { grid-template-columns: 20px minmax(0, 1fr); }
  .install-promotion-actions { grid-column: 1 / -1; }
}
</style>
