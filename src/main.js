import 'whatwg-fetch'
import Vue from 'vue'
import App from './App.vue'
import Vuetify from 'vuetify/lib';
import router from './router'
import VueI18n from 'vue-i18n';
import VueClipboard from 'vue-clipboard2';
import chs from 'vuetify/es5/locale/zh-Hans';
import eng from 'vuetify/es5/locale/en';

Vue.use(Vuetify);
Vue.use(VueI18n);
Vue.use(VueClipboard);
VueClipboard.config.autoSetContainer = true;
Vue.config.productionTip = false;

const i18n = new VueI18n({
    locale: localStorage.lang || 'chs',
    messages: {
        'chs': require('./lang/chs'),
        'eng': require('./lang/eng')
    }
});

const vuetify = new Vuetify({
    lang: {
        locales: {chs, eng},
        current: localStorage.lang || 'chs',
    },
    theme: {
        dark: true,
    },
});

new Vue({
    i18n,
    router,
    vuetify,
    render: h => h(App)
}).$mount('#app');
