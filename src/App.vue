<template>
  <v-app id="app">
    <Drawer />
    <v-content>
      <router-view />
    </v-content>
  </v-app>
</template>
<style>
.pn input {
  text-transform: uppercase;
}

div.v-application {
    display: block;
    th {
        white-space: nowrap;
    }
    div.v-content__wrap {
        width: 100%;
    }
}
</style>
<script>
import Drawer from "@/components/Drawer";
export default {
  components: {
    Drawer
  },
  watch: {
    $route(to, from) {
      if (to.meta.title) {
        document.title = "FlashMaster - " + this.$t(to.meta.title);
      } else {
        document.title = "iTXTech FlashMaster";
      }
    }
  }
};
</script>
