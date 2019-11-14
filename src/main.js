import 'whatwg-fetch'
import Vue from 'vue'
import App from './App.vue'
import Vuetify from 'vuetify/lib';
import router from './router'
import VueI18n from 'vue-i18n';
import VueClipboard from 'vue-clipboard2'

Vue.use(Vuetify);
Vue.use(VueI18n);
Vue.use(VueClipboard);
VueClipboard.config.autoSetContainer = true
Vue.config.productionTip = false

const i18n = new VueI18n({
  locale: localStorage.lang || 'zh-CN',
  messages: {
    'zh-CN': require('./lang/zh-CN'),
    'en-US': require('./lang/en-US')
  }
})

const vuetify = new Vuetify({
  theme: {
    dark: true,
  },
})

new Vue({
  i18n,
  router,
  vuetify,
  render: h => h(App)
}).$mount('#app')
