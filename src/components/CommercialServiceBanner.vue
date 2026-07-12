<template>
  <section ref="bannerRef" class="service-banner" :aria-label="$t('serviceBanner.ariaLabel')">
    <div class="service-banner-icon" aria-hidden="true">
      <v-icon icon="mdi-hammer-wrench" size="18" />
    </div>
    <div class="service-banner-copy">
      <div class="service-banner-title">{{ $t('serviceBanner.title') }}</div>
      <div class="service-banner-description">{{ $t('serviceBanner.description') }}</div>
    </div>
    <div class="service-banner-actions">
      <v-btn
        class="service-banner-action"
        color="primary"
        density="comfortable"
        :href="contactUrl"
        prepend-icon="mdi-message-outline"
        :rel="contactRel"
        size="small"
        :target="contactTarget"
        variant="flat"
        @click="handleContactClick"
      >
        {{ $t('serviceBanner.contact') }}
      </v-btn>
      <v-btn
        class="service-banner-action"
        color="secondary"
        density="comfortable"
        prepend-icon="mdi-view-list-outline"
        size="small"
        variant="tonal"
        @click="openScopeDialog"
      >
        {{ $t('serviceBanner.scope') }}
      </v-btn>
    </div>
    <v-btn
      class="service-banner-close"
      density="compact"
      icon="mdi-close"
      size="x-small"
      :title="$t('serviceBanner.close')"
      variant="text"
      @click="dismissBanner"
    />
  </section>

  <v-dialog
    v-model="scopeDialog"
    aria-labelledby="service-scope-dialog-title"
    class="service-scope-dialog"
    content-class="service-scope-dialog-content"
    max-width="640"
  >
    <section class="panel service-scope-panel">
      <div class="panel-header">
        <div id="service-scope-dialog-title" class="panel-title service-scope-heading">
          <v-icon icon="mdi-briefcase-outline" size="17" />
          <span>{{ $t('serviceBanner.dialogTitle') }}</span>
        </div>
        <v-btn
          :aria-label="$t('serviceBanner.closeDialog')"
          icon="mdi-close"
          variant="text"
          @click="scopeDialog = false"
        />
      </div>
      <div class="panel-body service-scope-body">
        <div class="service-scope-intro" v-html="$t('serviceBanner.introHtml')" />
        <p class="service-scope-description">{{ $t('serviceBanner.dialogDescription') }}</p>
        <div class="service-scope-groups">
          <section v-for="group in scopeGroups" :key="group.title" class="service-scope-group">
            <div class="service-scope-group-title">{{ group.title }}</div>
            <div class="service-scope-grid">
              <div v-for="item in group.items" :key="item" class="service-scope-item">
                <v-icon icon="mdi-check-circle-outline" size="16" />
                <span>{{ item }}</span>
              </div>
            </div>
          </section>
        </div>
        <div class="service-scope-actions">
          <v-btn
            color="primary"
            :href="contactUrl"
            prepend-icon="mdi-message-outline"
            :rel="contactRel"
            :target="contactTarget"
            variant="flat"
            @click="handleContactClick"
          >
            {{ $t('serviceBanner.contact') }}
          </v-btn>
        </div>
      </div>
    </section>
  </v-dialog>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { trackServiceEvent } from '@/services/analytics';

const props = defineProps({
  surface: {
    type: String,
    default: 'global_top'
  }
});
const emit = defineEmits(['dismiss', 'resize']);

const route = useRoute();
const { locale, tm } = useI18n();
const scopeDialog = ref(false);
const bannerRef = ref(null);
const contactUrl = 'mailto:peratx@itxtech.org?subject=FlashMaster%20custom%20development';
const contactTarget = computed(() => (/^https?:\/\//i.test(contactUrl) ? '_blank' : undefined));
const contactRel = computed(() => (contactTarget.value ? 'noopener noreferrer' : undefined));
const scopeGroups = computed(() => Object.values(tm('serviceBanner.scopeGroups')).map(group => ({
  title: String(group.title),
  items: Object.values(group.items).map(item => String(item))
})));

function track(event, action, label = 'banner') {
  trackServiceEvent({
    event,
    surface: props.surface,
    routeName: route.name,
    action,
    label
  });
}

function handleContactClick() {
  trackCommercialBannerInteraction('contact');
  track('commercial_contact_click', 'contact');
}

function openScopeDialog() {
  scopeDialog.value = true;
  trackCommercialBannerInteraction('scope');
  track('commercial_scope_click', 'scope');
}

function dismissBanner() {
  trackCommercialBannerInteraction('close');
  track('commercial_banner_close', 'close');
  emit('dismiss');
}

function trackCommercialBannerInteraction(action) {
  track('commercial_banner_interaction', action);
}

let resizeObserver;
let resizeTimer;

function emitBannerSize() {
  const height = bannerRef.value?.getBoundingClientRect().height || 0;
  emit('resize', Math.ceil(height));
}

function scheduleBannerSizeEmit() {
  window.clearTimeout(resizeTimer);
  emitBannerSize();
  window.requestAnimationFrame(() => {
    emitBannerSize();
    window.requestAnimationFrame(emitBannerSize);
  });
  resizeTimer = window.setTimeout(emitBannerSize, 240);
}

onMounted(async () => {
  await nextTick();
  scheduleBannerSizeEmit();
  document.fonts?.ready?.then(scheduleBannerSizeEmit).catch(() => {});
  window.addEventListener('resize', scheduleBannerSizeEmit);
  if (bannerRef.value && window.ResizeObserver) {
    resizeObserver = new ResizeObserver(scheduleBannerSizeEmit);
    resizeObserver.observe(bannerRef.value);
  }
});

onUnmounted(() => {
  window.clearTimeout(resizeTimer);
  window.removeEventListener('resize', scheduleBannerSizeEmit);
  resizeObserver?.disconnect();
});

watch(locale, async () => {
  await nextTick();
  scheduleBannerSizeEmit();
});
</script>
