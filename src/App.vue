<template>
  <v-app id="app">
    <Drawer />
    <v-content>
      <router-view />
    </v-content>
  </v-app>
</template>

<script>
import Drawer from "@/components/Drawer";
export default {
  components: {
    Drawer
  }
};
</script>
