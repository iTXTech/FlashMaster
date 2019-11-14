<template>
  <v-container>
    <v-navigation-drawer v-model="drawer" :clipped="$vuetify.breakpoint.lgAndUp" app>
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title class="title">FlashMaster</v-list-item-title>
          <v-list-item-subtitle>by PeratX@iTXTech.org</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>

      <v-divider></v-divider>
      <v-list dense nav>
        <v-list-item-group color="primary">
          <v-list-item v-for="(item, i) in items" :key="i" :to="item.path">
            <v-list-item-icon>
              <v-icon v-text="item.icon"></v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title v-text="item.text"></v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list-item-group>
      </v-list>

      <v-footer absolute class="font-weight-medium">
        <v-col class="text-center" cols="12">
          <h6>Copyright (C) 2019 iTX Technologies</h6>
        </v-col>
      </v-footer>
    </v-navigation-drawer>

    <v-app-bar :clipped-left="$vuetify.breakpoint.lgAndUp" app color="blue darken-3" dark>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <v-img
        alt="FlashMaster Logo"
        :src="require('@/assets/logo.png')"
        class="shrink mr-2"
        contain
        transition="scale-transition"
        width="40"
      />
      <v-toolbar-title class="mr-12 align-center">
        <span class="hidden-sm-and-down">iTXTech FlashMaster</span>
      </v-toolbar-title>
      <v-spacer />
      <v-btn href="https://github.com/iTXTech/FlashMaster" target="_blank" text>
        <span class="mr-2">GitHub</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>

      <v-menu offset-y>
        <template v-slot:activator="{ on }">
          <v-btn color="primary" dark v-on="on">{{$t("lang")}}</v-btn>
        </template>
        <v-list>
          <v-list-item v-for="(item, index) in langs" :key="index" @click="changeLanguage(item)">
            <v-list-item-title>{{ item }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>
  </v-container>
</template>

<script>
export default {
  props: {
    source: String
  },

  data: () => ({
    dialog: false,
    drawer: false
  }),

  computed: {
    langs() {
      return Object.keys(this.$i18n.messages);
    },
    items() {
      return [
        {
          icon: "mdi-adjust",
          text: this.$t("nav.decodePartNumber"),
          path: "/decode"
        },
        {
          icon: "mdi-magnify",
          text: this.$t("nav.searchPartNumber"),
          path: "/searchPn"
        },
        {
          icon: "mdi-flash",
          text: this.$t("nav.searchFlashId"),
          path: "/searchId"
        },
        {
          icon: "mdi-settings",
          text: this.$t("nav.settings"),
          path: "/settings"
        },
        {
          icon: "mdi-information",
          text: this.$t("nav.about"),
          path: "/about"
        }
      ];
    }
  },

  methods: {
    changeLanguage(item) {
      this.$i18n.locale = item;
      localStorage.lang = item;
    }
  }
};
</script>