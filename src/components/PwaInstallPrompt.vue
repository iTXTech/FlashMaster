<template>
  <section v-if="visible" class="panel install-promotion" aria-labelledby="install-promotion-title">
    <v-icon icon="mdi-download" color="primary" aria-hidden="true" />
    <div class="install-promotion-copy">
      <div id="install-promotion-title" class="panel-title">{{ title }}</div>
      <p>{{ $t('install.benefit') }}</p>
    </div>
    <div class="install-promotion-actions">
      <v-btn color="primary" variant="tonal" :loading="state.busy" @click="install">{{ action }}</v-btn>
      <v-btn variant="text" @click="dismiss">{{ $t('install.later') }}</v-btn>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { usePwaInstall } from '@/composables/usePwaInstall';

const props = defineProps({ successful: Boolean });
const { state, title, action, install, dismiss, promotionAllowed, claimPromotion } = usePwaInstall();
const ready = ref(false);
const shown = ref(false);
const blocked = ref(true);
const visible = computed(() => shown.value && props.successful && !blocked.value && promotionAllowed.value);
let delay;
let observer;
let stopObserving;

function checkInteraction() {
  const editing = document.activeElement?.matches('input, textarea, [contenteditable="true"]');
  const overlay = document.querySelector('.v-overlay--active, .v-navigation-drawer--temporary.v-navigation-drawer--active');
  const viewport = window.visualViewport;
  const keyboard = state.mobile && viewport && viewport.height * viewport.scale < window.innerHeight - 120;
  blocked.value = document.hidden || Boolean(editing || overlay || keyboard);
  if (ready.value && props.successful && !blocked.value && !shown.value && claimPromotion()) shown.value = true;
}

watch(() => props.successful, value => {
  clearTimeout(delay);
  ready.value = false;
  shown.value = false;
  if (value) delay = setTimeout(() => {
    ready.value = true;
    checkInteraction();
  }, 1500);
}, { immediate: true });
watch(promotionAllowed, checkInteraction);

onMounted(() => {
  stopObserving = watch(() => props.successful && promotionAllowed.value && (!state.hintShown || shown.value), (active, _, cleanup) => {
    if (!active) return;
    // Observe only while an eligible result is present; never poll in the background.
    observer = new MutationObserver(checkInteraction);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('focusin', checkInteraction);
    document.addEventListener('focusout', checkInteraction);
    document.addEventListener('visibilitychange', checkInteraction);
    window.visualViewport?.addEventListener('resize', checkInteraction);
    cleanup(() => {
      observer.disconnect();
      document.removeEventListener('focusin', checkInteraction);
      document.removeEventListener('focusout', checkInteraction);
      document.removeEventListener('visibilitychange', checkInteraction);
      window.visualViewport?.removeEventListener('resize', checkInteraction);
    });
    checkInteraction();
  }, { immediate: true });
});

onUnmounted(() => {
  clearTimeout(delay);
  stopObserving?.();
});
</script>

<style scoped>
.install-promotion { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.install-promotion-copy { flex: 1; min-width: 0; }
.install-promotion-copy p { margin: 4px 0 0; font-size: 13px; color: rgb(var(--v-theme-on-surface-variant)); }
.install-promotion-actions { display: flex; flex-wrap: wrap; gap: 4px; }
@media (max-width: 600px) {
  .install-promotion { flex-wrap: wrap; }
  .install-promotion-actions { width: 100%; justify-content: flex-end; }
}
</style>
