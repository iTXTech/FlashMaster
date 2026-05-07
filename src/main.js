import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import './styles/app.css';

import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import App from './App.vue';
import chs from './lang/chs.js';
import eng from './lang/eng.js';
import router from './router';
import store from './store';
import theme from './theme';

const i18n = createI18n({
    legacy: false,
    locale: store.getLang(),
    fallbackLocale: 'eng',
    messages: { chs, eng }
});

const vuetify = createVuetify({
    components,
    directives,
    icons: {
        defaultSet: 'mdi'
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
