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
        <div class="drawer-info-line">{{ $t('version', [projectVersion]) }}</div>
        <div class="drawer-info-line">by PeratX@iTXTech.org</div>
        <div class="drawer-info-line">{{ $t('group') }}</div>
      </div>

      <v-divider />

      <v-list density="compact" nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.path"
          :prepend-icon="item.icon"
          :title="$t(item.title)"
          :to="item.path"
          color="primary"
          rounded="sm"
        />
      </v-list>

      <template #append>
        <div class="nav-footer">© 2019-2026 iTX Technologies</div>
      </template>
    </v-navigation-drawer>

    <v-main>
      <MarketTicker v-if="marketTickerEnabled" @close="closeMarketTicker" />
      <router-view />
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

    <ChangelogDialog v-model="changelogDialog" :app-version="changelogVersion" />
  </v-app>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useDisplay, useTheme } from 'vuetify';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import ChangelogDialog from '@/components/ChangelogDialog.vue';
import MarketTicker from '@/components/MarketTicker.vue';
import logo from '@/assets/logo.png';
import bus from '@/store/bus';
import store from '@/store';
import themeManager from '@/theme';

const route = useRoute();
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
const marketTickerEnabled = ref(store.isMarketTickerEnabled());

const navItems = [
  { icon: 'mdi-crosshairs-gps', title: 'nav.decodePartNumber', path: '/decode' },
  { icon: 'mdi-magnify', title: 'nav.searchPartNumber', path: '/searchPn' },
  { icon: 'mdi-memory', title: 'nav.decodeId', path: '/decodeId' },
  { icon: 'mdi-flash', title: 'nav.searchFlashId', path: '/searchId' },
  { icon: 'mdi-tune', title: 'nav.settings', path: '/settings' },
  { icon: 'mdi-information-outline', title: 'nav.about', path: '/about' }
];

const languages = computed(() => Object.entries(messages.value).map(([code, message]) => ({
  code,
  name: message.lang
})));

const projectVersion = computed(() => store.getProjectVersion());
const changelogVersion = computed(() => store.getChangelogVersion(projectVersion.value));
const pageTitle = computed(() => route.meta.title ? `FlashMaster / ${t(route.meta.title)}` : 'FlashMaster');

const applyTheme = () => {
  vuetifyTheme.change(themeManager.resolveThemeName(store.getTheme()));
};

const changeLanguage = value => {
  locale.value = value;
  store.setLang(value);
};

const closeMarketTicker = () => {
  store.setMarketTickerEnabled(false);
  marketTickerEnabled.value = false;
  bus.emit('marketTicker');
};

const updateTitle = () => {
  document.title = pageTitle.value;
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
let offMarketTicker;
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
  offMarketTicker = bus.on('marketTicker', () => {
    marketTickerEnabled.value = store.isMarketTickerEnabled();
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
  offMarketTicker?.();
  mediaQuery?.removeEventListener?.('change', applyTheme);
});

watch([() => route.meta.title, locale, () => vuetifyTheme.global.name.value], updateTitle);
watch(mobile, value => {
  drawer.value = !value;
});
watch(changelogDialog, value => {
  if (!value) {
    store.setSeenChangelogVersion(changelogVersion.value);
  }
});
</script>
