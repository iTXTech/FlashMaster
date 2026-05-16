<template>
  <v-app class="app-shell">
    <v-app-bar density="compact" flat border class="compact-app-bar">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title class="app-title font-weight-bold">{{ pageTitle }}</v-toolbar-title>
      <v-spacer />

      <v-menu>
        <template #activator="{ props }">
          <v-btn v-bind="props" icon="mdi-translate" variant="text" :title="$t('customization.language')" />
        </template>
        <v-list density="compact">
          <v-list-item
            v-for="item in languages"
            :key="item.code"
            :title="item.name"
            :active="item.code === locale"
            @click="changeLanguage(item.code)"
          />
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      :permanent="!mobile && drawer"
      :temporary="mobile || !drawer"
      width="256"
      class="side-nav"
    >
      <div class="drawer-info">
        <div class="drawer-info-brand">
          <img :src="logo" alt="FlashMaster" class="drawer-info-logo" />
          <div class="drawer-info-title">FlashMaster</div>
        </div>
        <div class="drawer-info-line">{{ $t('productTagline') }}</div>
        <div class="drawer-info-line">{{ $t('version', [projectVersion]) }}</div>
        <div class="drawer-info-line">{{ $t('group') }}</div>
      </div>

      <v-divider />

      <v-list density="compact" nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.key"
          :prepend-icon="item.icon"
          :title="$t(item.title)"
          :to="item.to"
          :active="item.active"
          color="primary"
          rounded="sm"
        />
      </v-list>

      <template #append>
        <div class="nav-footer">
          <div>© 2019-2026 iTX Technologies</div>
          <a
            v-if="footerNotice.url"
            class="nav-footer-notice"
            :href="footerNotice.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ footerNotice.text }}
          </a>
          <div v-else-if="footerNotice.text" class="nav-footer-notice">{{ footerNotice.text }}</div>
        </div>
      </template>
    </v-navigation-drawer>

    <v-main class="main-surface">
      <MarketPulse v-if="marketPulseEnabled" @close="closeMarketPulse" />
      <router-view />
      <div v-if="serviceBannerVisible" class="service-banner-spacer" aria-hidden="true" />
      <CommercialServiceBanner v-if="serviceBannerVisible" surface="commercial_banner" @dismiss="dismissServiceBanner" />
    </v-main>

    <v-snackbar
      v-model="snackbar.show"
      :timeout="snackbar.timeout"
      color="surface-variant"
      location="bottom right"
    >
      {{ snackbar.text }}
      <template #actions>
        <v-btn color="primary" variant="text" @click="snackbar.show = false">{{ $t('close') }}</v-btn>
      </template>
    </v-snackbar>

    <ChangelogDialog v-model="changelogDialog" :app-version="projectVersion" />
  </v-app>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useDisplay, useTheme } from 'vuetify';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import ChangelogDialog from '@/components/ChangelogDialog.vue';
import CommercialServiceBanner from '@/components/CommercialServiceBanner.vue';
import MarketPulse from '@/components/MarketPulse.vue';
import logo from '@/assets/app-icon.svg';
import {
  aboutRoute,
  appLocaleFromRoute,
  idsRoute,
  idsSearchRoute,
  partsRoute,
  partsSearchRoute,
  ROUTE_NAMES,
  routeWithAppLocale,
  settingsRoute
} from '@/router/locations';
import bus from '@/store/bus';
import store from '@/store';
import themeManager from '@/theme';

const route = useRoute();
const router = useRouter();
const vuetifyTheme = useTheme();
const { mobile } = useDisplay();
const { locale, messages, t } = useI18n();

const drawer = ref(!mobile.value);
const snackbar = ref({
  timeout: 1000,
  show: false,
  text: ''
});
const changelogDialog = ref(false);
const marketPulseEnabled = ref(store.isMarketPulseEnabled());
const footerNotice = {
  text: String(import.meta.env.VITE_FLASHMASTER_FOOTER_NOTICE_TEXT || '').trim(),
  url: String(import.meta.env.VITE_FLASHMASTER_FOOTER_NOTICE_URL || '').trim()
};

const isActiveRoute = names => names.includes(route.name);
const navItems = computed(() => [
  {
    key: 'parts',
    icon: 'mdi-chip',
    title: 'nav.decodePartNumber',
    to: partsRoute(route),
    active: isActiveRoute([ROUTE_NAMES.parts, ROUTE_NAMES.part])
  },
  {
    key: 'parts-search',
    icon: 'mdi-magnify',
    title: 'nav.searchPartNumber',
    to: partsSearchRoute('', route),
    active: isActiveRoute([ROUTE_NAMES.partsSearch])
  },
  {
    key: 'ids',
    icon: 'mdi-memory',
    title: 'nav.decodeId',
    to: idsRoute(route),
    active: isActiveRoute([ROUTE_NAMES.ids, ROUTE_NAMES.id])
  },
  {
    key: 'ids-search',
    icon: 'mdi-flash',
    title: 'nav.searchFlashId',
    to: idsSearchRoute('', route),
    active: isActiveRoute([ROUTE_NAMES.idsSearch])
  },
  {
    key: 'settings',
    icon: 'mdi-tune',
    title: 'nav.settings',
    to: settingsRoute(route),
    active: isActiveRoute([ROUTE_NAMES.settings])
  },
  {
    key: 'about',
    icon: 'mdi-information-outline',
    title: 'nav.about',
    to: aboutRoute(route),
    active: isActiveRoute([ROUTE_NAMES.about])
  }
]);

const languages = computed(() => Object.entries(messages.value).map(([code, message]) => ({
  code,
  name: message.lang
})));

const projectVersion = computed(() => store.getProjectVersion());
const changelogVersion = computed(() => store.getChangelogVersion(projectVersion.value));
const serviceBannerVisible = ref(store.shouldShowServiceBanner(changelogVersion.value));
const pageTitle = computed(() => route.meta.title ? `FlashMaster / ${t(route.meta.title)}` : 'FlashMaster');

const applyTheme = () => {
  vuetifyTheme.change(themeManager.resolveThemeName(store.getTheme()));
};

const syncRouteLocale = () => {
  const next = appLocaleFromRoute(route);
  if (!next || next === locale.value) return;
  locale.value = next;
  store.setLang(next);
};

const changeLanguage = value => {
  locale.value = value;
  store.setLang(value);
  router.push(routeWithAppLocale(route, value));
};

const closeMarketPulse = () => {
  store.setMarketPulseEnabled(false);
  marketPulseEnabled.value = false;
  bus.emit('marketPulse');
};

const dismissServiceBanner = () => {
  store.setServiceBannerDismissed(changelogVersion.value);
  serviceBannerVisible.value = false;
};

const updateTitle = () => {
  document.title = pageTitle.value;
  document.documentElement.lang = locale.value === 'eng' ? 'en' : 'zh-CN';
  const robots = document.querySelector('meta[name="robots"]');
  robots?.setAttribute('content', route.meta.robots || 'index, follow');
  const primary = vuetifyTheme.current.value.colors.primary;
  for (const name of ['theme-color', 'msapplication-navbutton-color', 'apple-mobile-web-app-status-bar-style']) {
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', primary);
  }
};

let offSnackbar;
let offTheme;
let offChangelog;
let offMarketPulse;
let mediaQuery;

onMounted(() => {
  applyTheme();
  updateTitle();
  offSnackbar = bus.on('snackbar', data => {
    snackbar.value = data;
  });
  offTheme = bus.on('theme', () => {
    applyTheme();
  });
  offChangelog = bus.on('changelog', () => {
    changelogDialog.value = true;
  });
  offMarketPulse = bus.on('marketPulse', () => {
    marketPulseEnabled.value = store.isMarketPulseEnabled();
  });
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener?.('change', applyTheme);
  if (store.shouldShowChangelog(changelogVersion.value)) {
    changelogDialog.value = true;
  }
});

onUnmounted(() => {
  offSnackbar?.();
  offTheme?.();
  offChangelog?.();
  offMarketPulse?.();
  mediaQuery?.removeEventListener?.('change', applyTheme);
});

watch(() => route.params.locale, syncRouteLocale, { immediate: true });
watch([() => route.meta.title, () => route.meta.robots, locale, () => vuetifyTheme.global.name.value], updateTitle);
watch(mobile, value => {
  drawer.value = !value;
});
watch(changelogDialog, value => {
  if (!value) {
    store.setSeenChangelogVersion(changelogVersion.value);
  }
});
watch(changelogVersion, value => {
  serviceBannerVisible.value = store.shouldShowServiceBanner(value);
});
</script>
