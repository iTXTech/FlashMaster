import 'whatwg-fetch'
import Vue from 'vue'
import App from './App.vue'
import Vuetify from 'vuetify/lib'
import router from './router'
import VueI18n from 'vue-i18n'
import VueClipboard from 'vue-clipboard2'
import chs from 'vuetify/es5/locale/zh-Hans'
import eng from 'vuetify/es5/locale/en'
import {Touch} from 'vuetify/lib/directives'
import store from './store/index'

Vue.use(Vuetify, {
    directives: {
        Touch
    }
});
Vue.use(VueI18n);
Vue.use(VueClipboard);
VueClipboard.config.autoSetContainer = true;
Vue.config.productionTip = false;

const i18n = new VueI18n({
    locale: store.getLang(),
    messages: {
        'chs': require('./lang/chs'),
        'eng': require('./lang/eng')
    }
});

const vuetify = new Vuetify({
    lang: {
        locales: {chs, eng},
        current: store.getLang(),
    },
    theme: {
        dark: true,
        themes: {
            dark: {
                primary: '#1e88e5',
                secondary: '#005cb2',
                accent: '#6ab7ff',
                error: '#b71c1c',
            }
        },
    },
});

new Vue({
    i18n,
    router,
    vuetify,
    render: h => h(App)
}).$mount('#app');
