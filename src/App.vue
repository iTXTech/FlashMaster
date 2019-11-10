<template>
  <v-app>
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
          <v-list-item v-else :key="item.text" link>
            <v-list-item-content>
              <v-list-item-title>{{ item.text }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </template>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar :clipped-left="$vuetify.breakpoint.lgAndUp" app color="blue darken-3" dark>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <v-img
        alt="FlashMaster Logo"
        :src="require('./assets/logo.png')"
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
    </v-app-bar>

    <v-content></v-content>
  </v-app>
</template>

<script>
export default {
  props: {
    source: String
  },
  name: "FlashMaster",

  components: {
  },

  data: () => ({
    dialog: false,
    drawer: null,
    items: [
      { text: "料号查询" },
      { text: "料号搜索" },
      { text: "闪存ID查询" },
      { text: "设置" },
      { text: "关于" }
    ]
  })
};
</script>
