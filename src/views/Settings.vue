<template>
  <v-container grid-list-xl fluid>
    <v-layout row wrap>
      <v-flex lg3 sm12 xs12>
        <v-card>
          <v-card-title>{{$t('settings.server')}}</v-card-title>
          <v-card-text>
            <v-combobox
              :items="items"
              :label="$t('settings.serverAddr')"
              :return-object="false"
              v-on:change="changeServer"
              v-model="server"
            />
            <v-checkbox
              :label="$t('settings.translation')"
              v-on:change="changeTranslation"
              v-model="autoTrans"
            />
          </v-card-text>
          <v-card-actions>
            <v-btn text @click="serverInfo">{{$t("settings.serverInfo")}}</v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>
<script>
import Store from "@/store";
export default {
  computed: {
    items() {
      var s = [];
      if (this.servers != []) {
        for (var server in this.servers) {
          s.push({
            value: this.servers[server],
            text: server
          });
        }
      }
      return s;
    }
  },
  data() {
    return {
      servers: [],
      server: Store.getServerAddress(),
      autoTrans: false
    };
  },
  created: function() {
    this.autoTrans = Store.autoTranslation() == "1" ? true : false;
    fetch(
      "https://raw.githubusercontent.com/PeratX/FlashMaster/master/servers.json"
    )
      .then(r => r.json())
      .then(data => {
        this.servers = data;
      });
  },
  methods: {
    changeServer(server) {
      Store.setServerAddress(server);
    },
    changeTranslation(value) {
      Store.setAutoTranslation(value);
    },
    serverInfo() {
      fetch(Store.getServerAddress() + "/info")
        .then(r => r.json())
        .then(data => {
          alert(
            this.$t("settings.info", [
              data.ver,
              data.info.fdb.time,
              data.info.flash_cnt,
              data.info.id_cnt,
              data.info.mdb_cnt,
              data.info.fdb.controllers
            ])
          );
        })
        .catch(err => {
          alert(this.$t("alert.fetchFailed", [err]));
        });
    }
  }
};
</script>