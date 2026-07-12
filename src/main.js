import './styles/vuetify.scss';
import './styles/app.css';

import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import { createVuetify } from 'vuetify';
import {
    VApp,
    VAppBar,
    VAppBarNavIcon,
    VBtn,
    VCheckboxBtn,
    VChip,
    VCombobox,
    VDialog,
    VDivider,
    VIcon,
    VList,
    VListItem,
    VMain,
    VMenu,
    VNavigationDrawer,
    VProgressLinear,
    VSelect,
    VSnackbar,
    VSpacer,
    VSwitch,
    VTextField,
    VToolbarTitle
} from 'vuetify/components';
import App from './App.vue';
import chs from './lang/chs.js';
import eng from './lang/eng.js';
import router from './router';
import store from './store';
import { aliases, mdi } from './theme/icons';
import theme from './theme';

const initialThemeName = theme.resolveThemeName(store.getTheme());
theme.applyDocumentTheme(initialThemeName);

const i18n = createI18n({
    legacy: false,
    locale: store.getLang(),
    fallbackLocale: 'eng',
    messages: { chs, eng }
});

const vuetify = createVuetify({
    components: {
        VApp,
        VAppBar,
        VAppBarNavIcon,
        VBtn,
        VCheckboxBtn,
        VChip,
        VCombobox,
        VDialog,
        VDivider,
        VIcon,
        VList,
        VListItem,
        VMain,
        VMenu,
        VNavigationDrawer,
        VProgressLinear,
        VSelect,
        VSnackbar,
        VSpacer,
        VSwitch,
        VTextField,
        VToolbarTitle
    },
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi
        }
    },
    theme: {
        defaultTheme: initialThemeName,
        themes: theme.VUETIFY_THEMES
    },
    defaults: {
        VBtn: {
            density: 'compact'
        },
        VTextField: {
            density: 'compact',
            variant: 'outlined'
        },
        VSelect: {
            density: 'compact',
            variant: 'outlined'
        },
        VCombobox: {
            density: 'compact',
            variant: 'outlined'
        },
        VCheckbox: {
            density: 'compact',
            hideDetails: true
        }
    }
});

function scheduleIdleTask(task) {
    const runWhenIdle = () => {
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(task, { timeout: 2500 });
        } else {
            window.setTimeout(task, 600);
        }
    };

    if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(runWhenIdle);
        });
    } else {
        runWhenIdle();
    }
}

function scheduleAfterFirstPaint(task) {
    const runAfterPaint = () => window.setTimeout(task, 0);

    if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(runAfterPaint);
        });
    } else {
        runAfterPaint();
    }
}

function isSingleFileBuild() {
    return typeof __FLASHMASTER_SINGLEFILE__ !== 'undefined' && Boolean(__FLASHMASTER_SINGLEFILE__);
}

function scheduleEmbeddedParserWarmup() {
    if (!store.isEmbeddedParser()) return;
    const scheduleWarmup = isSingleFileBuild() ? scheduleIdleTask : scheduleAfterFirstPaint;
    scheduleWarmup(async () => {
        if (!store.isEmbeddedParser()) return;
        try {
            const { warmEmbeddedParser } = await import('./services/flashApi');
            if (store.isEmbeddedParser()) {
                await warmEmbeddedParser();
            }
        } catch {
            // Warmup is opportunistic; normal lookup paths will still initialize on demand.
        }
    });
}

createApp(App)
    .use(router)
    .use(i18n)
    .use(vuetify)
    .mount('#app');

scheduleEmbeddedParserWarmup();
