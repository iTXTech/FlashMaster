import 'vuetify/styles';
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
        defaultTheme: theme.resolveThemeName(store.getTheme()),
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

createApp(App)
    .use(router)
    .use(i18n)
    .use(vuetify)
    .mount('#app');
