<template>
  <v-app id="app">
    <Drawer />
    <v-content>
      <router-view />
    </v-content>
    <v-snackbar v-model="snackbar.show" :timeout="snackbar.timeout">
      {{snackbar.text}}
      <v-btn text color="blue" @click="snackbar.show = false">{{$t('close')}}</v-btn>
    </v-snackbar>
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
import bus from "@/store/bus.js";
export default {
  data: () => {
    return {
      snackbar: {
        timeout: 1000,
        show: false,
        text: ""
      }
    };
  },
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
  },
  mounted: function() {
    var vm = this;
    bus.$on("snackbar", data => {
      vm.snackbar = data;
    });
  }
};
</script>
