<template>
  <section class="service-banner" :aria-label="$t('serviceBanner.ariaLabel')">
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
        prepend-icon="mdi-email-outline"
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
    class="service-scope-dialog"
    content-class="service-scope-dialog-content"
    max-width="640"
  >
    <section class="panel service-scope-panel">
      <div class="panel-header">
        <div class="panel-title service-scope-heading">
          <v-icon icon="mdi-briefcase-outline" size="17" />
          <span>{{ $t('serviceBanner.dialogTitle') }}</span>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="scopeDialog = false" />
      </div>
      <div class="panel-body service-scope-body">
        <div class="service-scope-intro" v-html="$t('serviceBanner.introHtml')" />
        <p class="service-scope-description">{{ $t('serviceBanner.dialogDescription') }}</p>
        <div class="service-scope-grid">
          <div v-for="item in scopeItems" :key="item" class="service-scope-item">
            <v-icon icon="mdi-check-circle-outline" size="16" />
            <span>{{ item }}</span>
          </div>
        </div>
        <div class="service-scope-actions">
          <v-btn
            color="primary"
            :href="contactUrl"
            prepend-icon="mdi-email-outline"
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
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { trackServiceEvent } from '@/services/analytics';

const props = defineProps({
  surface: {
    type: String,
    default: 'global_top'
  }
});
const emit = defineEmits(['dismiss']);

const route = useRoute();
const { tm } = useI18n();
const scopeDialog = ref(false);
const contactUrl = 'mailto:peratx@itxtech.org?subject=FlashMaster%20custom%20development';
const contactTarget = computed(() => (/^https?:\/\//i.test(contactUrl) ? '_blank' : undefined));
const contactRel = computed(() => (contactTarget.value ? 'noopener noreferrer' : undefined));
const scopeItems = computed(() => Object.values(tm('serviceBanner.scopeItems')).map(item => String(item)));

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
</script>
