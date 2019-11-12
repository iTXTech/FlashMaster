<template>
  <v-container grid-list-xl fluid>
    <v-layout row wrap>
      <v-flex lg3 sm12 xs12>
        <v-card>
          <v-card-title>{{$t('settings.server')}}</v-card-title>
          <v-card-text>
            <v-combobox
              :items="items"
              v-bind:label="$t('settings.serverAddr')"
              :return-object="false"
            />
            <v-checkbox v-bind:label="$t('settings.translation')" />
          </v-card-text>
          <v-card-actions>
            <v-btn text>{{$t("settings.serverInfo")}}</v-btn>
            <v-btn text>{{$t("settings.save")}}</v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>
<script>
export default {
  computed: {
    items() {
        var s = [];
        if(this.servers != []){
            for(var server in this.servers){
                s.push({
                    value: this.servers[server],
                    text: server
                })
            }
        }
        return s;
    }
  },
  data() {
    return {
      servers: []
    };
  },
  created: function() {
    fetch("https://raw.githubusercontent.com/PeratX/FlashMaster/master/servers.json" )
      .then(r => r.json())
      .then(data => {
        this.servers = data;
        console.log(this.servers);
      });
  }
};
</script>