<template>
  <v-container grid-list-xl fluid>
    <v-layout row wrap>
      <v-flex lg4 sm12 xs12>
        <v-card class="fm-bg">
          <v-card-title>{{ $t('nav.about') }}</v-card-title>
          <v-card-text>
            <p v-html="$t('about', [client])"/>
          </v-card-text>
        </v-card>
      </v-flex>

      <v-flex lg3 sm12 xs12 v-show="showSponsor">
        <v-card class="fm-bg">
          <v-card-title>{{ $t('support.alipay') }}</v-card-title>
          <v-card-text>
            <v-img :src="require('@/assets/alipay.jpg')"/>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" href="https://qr.alipay.com/FKX04751EZDP0SQ0BOT137" target="_blank" text>
              {{ $t('support.alipayUrl') }}
            </v-btn>
            <v-btn color="accent" text :href="require('@/assets/alipay.jpg')" download="alipay.jpg">
              {{ $t('support.saveQrCode') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>
<script>
export default {
  methods: {
    getBrowserInfo() {
      let ua = navigator.userAgent;
      /**
       * https://stackoverflow.com/questions/5916900/how-can-you-detect-the-version-of-a-browser
       */
      let tem,
          M = ua.match(/(flashmasterios|flashmasterandroid|opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*([.\d]+)/i) || [];
      if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return {name: "IE", version: tem[1] || ""};
      }
      if (M[1] === "Chrome") {
        tem = ua.match(/\b(OPR|Edge)\/([.\d]+)/i);
        if (tem != null)
          return {name: tem[1].replace("OPR", "Opera"), version: tem[2]};
      }
      M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, "-?"];
      if ((tem = ua.match(/version\/([.\d]+)/i)) != null) M.splice(1, 1, tem[1]);
      return {name: M[0], version: M[1]};
    }
  },
  computed: {
    client() {
      let browser = this.getBrowserInfo();
      return `${browser.name} ${browser.version}`;
    },
    showSponsor() {
      return !navigator.userAgent.includes("NoSponsor");
    }
  }
};
</script>
