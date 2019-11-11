
<template>
  <v-container>
    <v-navigation-drawer v-model="drawer" :clipped="$vuetify.breakpoint.lgAndUp" app>
      <v-list dense>
        <template v-for="item in items">
          <v-row v-if="item.heading" :key="item.heading" align="center">
            <v-col cols="6">
              <v-subheader v-if="item.heading">{{ item.heading }}</v-subheader>
            </v-col>
            <v-col cols="6" class="text-center">
              <a href="#!" class="body-2 black--text">EDIT</a>
            </v-col>
          </v-row>
          <v-list-group
            v-else-if="item.children"
            :key="item.text"
            v-model="item.model"
            :prepend-icon="item.model ? item.icon : item['icon-alt']"
            append-icon
          >
            <template v-slot:activator>
              <v-list-item>
                <v-list-item-content>
                  <v-list-item-title>{{ item.text }}</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </template>
            <v-list-item v-for="(child, i) in item.children" :key="i" link>
              <v-list-item-action v-if="child.icon">
                <v-icon>{{ child.icon }}</v-icon>
              </v-list-item-action>
              <v-list-item-content>
                <v-list-item-title>{{ child.text }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list-group>
          <v-list-item v-else :key="item.text" link @click="goToPage(item)">
            <v-list-item-icon>
              <v-icon>{{ item.icon }}</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>{{ item.text }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </template>
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
    drawer: true
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
        { icon: "mdi-information", text: this.$t("nav.about"), path: "/about" }
      ];
    }
  },

  methods: {
    goToPage(item) {
      if (this.$route.path === item.path) {
        return;
      }
      this.$router.push({
        path: item.path
      });
    },
    changeLanguage(item) {
      this.$i18n.locale = item;
      localStorage.lang = item;
    }
  }
};
</script>