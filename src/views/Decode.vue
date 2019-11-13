<template>
  <div>
    <v-container grid-list-xl fluid>
      <v-layout row wrap>
        <v-flex lg3 sm12 xs12>
          <v-card>
            <v-card-title>{{$t('partNumber')}}</v-card-title>
            <v-card-text>
              <v-text-field required class="pn" v-model="partNumber" v-on:keyup.enter="query" />
            </v-card-text>
            <v-card-actions>
              <v-btn text @click="query">{{$t("query")}}</v-btn>
              <v-btn text @click="search">{{$t("search")}}</v-btn>
            </v-card-actions>
          </v-card>
        </v-flex>

        <v-flex lg2 sm12 xs12>
          <v-card>
            <v-card-title>{{$t('vendor')}}</v-card-title>
            <v-card-text>
              <v-img :src="vendorLogo" />
              <v-text-field required v-model="vendor">美光</v-text-field>
            </v-card-text>
          </v-card>
        </v-flex>

        <v-flex lg2 sm12 xs12>
          <v-card>
            <v-card-text>
              <v-text-field required :label="$t('type')" v-model="type" />
              <v-text-field required :label="$t('density')" v-model="density" />
              <v-text-field required :label="$t('deviceWidth')" v-model="deviceWidth" />
              <v-text-field required :label="$t('cellLevel')" v-model="cellLevel" />
            </v-card-text>
          </v-card>
        </v-flex>

        <v-flex lg2 sm12 xs12>
          <v-card>
            <v-card-text>
              <v-text-field required :label="$t('processNode')" v-model="processNode" />
              <v-text-field required :label="$t('generation')" v-model="generation" />
              <v-checkbox disabled :label="$t('sync')" v-model="sync" />
              <v-checkbox disabled :label="$t('async')" v-model="async" />
            </v-card-text>
          </v-card>
        </v-flex>

        <v-flex lg2 sm12 xs12>
          <v-card>
            <v-card-text>
              <v-text-field required :label="$t('ce')" v-model="ce" />
              <v-text-field required :label="$t('ch')" v-model="ch" />
              <v-text-field required :label="$t('die')" v-model="die" />
              <v-text-field required :label="$t('rb')" v-model="rb" />
            </v-card-text>
          </v-card>
        </v-flex>

        <v-flex lg4 sm12 xs12>
          <v-card>
            <v-card-text>
              <v-text-field required :label="$t('voltage')" v-model="voltage" />
              <v-text-field required :label="$t('package')" v-model="pkg" />
              <v-textarea auto-grow rows="1" :label="$t('controllers')" v-model="controllers" />
              <v-text-field required :label="$t('comment')" v-model="comment" />
            </v-card-text>
          </v-card>
        </v-flex>

        <v-flex lg4 sm12 xs12>
          <v-card>
            <v-app-bar flat dense color="transparent">
              <v-toolbar-title>{{$t('extraInfo')}}</v-toolbar-title>
              <v-spacer></v-spacer>
              <v-btn icon @click="copyAll">
                <v-icon>mdi-content-copy</v-icon>
              </v-btn>
            </v-app-bar>
            <v-card-text>
              <v-data-table
                :headers="extraInfoHeaders"
                :items="extraInfo"
                hide-default-footer
                disable-sort
                class="elevation-1"
              >
                <template slot="no-data">
                  <div></div>
                </template>
                <template v-slot:item.copy="{ item }">
                  <v-btn icon @click="copy(item)">
                    <v-icon>mdi-content-copy</v-icon>
                  </v-btn>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-flex>

        <v-flex lg3 sm12 xs12>
          <v-card>
            <v-app-bar flat dense color="transparent">
              <v-toolbar-title>{{$t('flashIds')}}</v-toolbar-title>
              <v-spacer></v-spacer>
              <v-btn icon @click="copyAllFlashIds">
                <v-icon>mdi-content-copy</v-icon>
              </v-btn>
            </v-app-bar>
            <v-card-text>
              <v-data-table
                :headers="flashIdHeaders"
                :items="flashIds"
                hide-default-footer
                disable-sort
                class="elevation-1"
              >
                <template slot="no-data">
                  <div></div>
                </template>
                <template v-slot:item.action="{ item }">
                  <v-btn icon @click="searchFlashId(item)">
                    <v-icon>mdi-magnify</v-icon>
                  </v-btn>
                  <v-btn icon @click="copyFlashId(item)">
                    <v-icon>mdi-content-copy</v-icon>
                  </v-btn>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-flex>
      </v-layout>
    </v-container>
    <v-snackbar v-model="snackbar.show" :timeout="snackbar.timeout">
      {{snackbar.text}}
      <v-btn text color="blue" @click="snackbar.show = false">{{$t('close')}}</v-btn>
    </v-snackbar>
  </div>
</template>
<style>
.pn input {
  text-transform: uppercase;
}
</style>
<script>
import Store from "@/store";
import router from "@/router";
import { isString } from "util";
export default {
  data() {
    return {
      snackbar: {
        timeout: 1000,
        show: false,
        text: ""
      },
      vendorLogo: "",
      partNumber: "",
      vendor: "",
      type: "",
      density: "",
      deviceWidth: "",
      cellLevel: "",
      processNode: "",
      generation: "",
      sync: false,
      async: false,
      ce: "",
      ch: "",
      die: "",
      rb: "",
      voltage: "",
      pkg: "",
      comment: "",
      rawVendor: "",
      controllers: "",
      extraInfoHeaders: [
        { text: this.$t("name"), value: "name", align: "left" },
        { text: this.$t("value"), value: "value" },
        { text: this.$t("copy"), value: "copy" }
      ],
      extraInfo: [],
      flashIdHeaders: [
        { text: this.$t("flashIds"), value: "id", align: "left" },
        { text: this.$t("action"), value: "action" }
      ],
      flashIds: []
    };
  },
  methods: {
    query() {
      if (this.partNumber != "") {
        this.partNumber = this.partNumber.toUpperCase();
        if (this.$route.query.pn != this.partNumber) {
          router.push({
            path: "/decode",
            query: { pn: this.partNumber }
          });
        }
        fetch(
          Store.getServerAddress() +
            "/decode?trans=" +
            Store.autoTranslation() +
            "&pn=" +
            this.partNumber
        )
          .then(r => r.json())
          .then(data => {
            data = data.data;
            this.vendor = data.vendor;
            this.type = data.type;
            this.density = data.density;
            this.deviceWidth = data.deviceWidth;
            this.cellLevel = data.cellLevel;
            this.processNode = data.processNode;
            this.generation = data.generation;
            this.voltage = data.voltage;
            this.pkg = data.package;
            this.rawVendor = data.rawVendor;
            this.vendorLogo = this.getVendorLogo();
            this.comment = data.comment;
            this.controllers = String(data.controller).replace(/,/g, ", ");

            if (data.interface == null) {
              this.sync = false;
              this.async = false;
            } else if (Object.keys(data.interface).includes("toggle")) {
              this.sync = data.interface.toggle;
              this.async = true;
            } else {
              this.sync = data.interface.sync;
              this.async = data.interface.async;
            }

            if (data.classification != null) {
              this.ce = this.isUnknown(data.classification.ce);
              this.ch = this.isUnknown(data.classification.ch);
              this.die = this.isUnknown(data.classification.die);
              this.rb = this.isUnknown(data.classification.rnb);
            }

            this.extraInfo = [];
            if (data.extraInfo != null && !isString(data.extraInfo)) {
              for (var extraInfo in data.extraInfo) {
                this.extraInfo.push({
                  name: extraInfo,
                  value: data.extraInfo[extraInfo]
                });
              }
            }

            this.flashIds = [];
            if (data.flashId != null && !isString(data.flashId)) {
              for (var flashId in data.flashId) {
                this.flashIds.push({
                  id: data.flashId[flashId]
                });
              }
            }
          })
          .catch(err => {
            this.snackbar = {
              timeout: 3000,
              show: true,
              text: this.$t("alert.fetchFailed", [err])
            };
          });
      } else {
        this.snackbar = {
          timeout: 3000,
          show: true,
          text: this.$t("alert.missingPartNumber")
        };
      }
    },
    isUnknown(v) {
      return v == -2 ? 2 : v == -1 ? this.$t("unknown") : v;
    },
    getVendorLogo() {
      switch (this.rawVendor) {
        case "intel":
          return require("@/assets/intel.svg");
        case "micron":
          return require("@/assets/micron.svg");
        case "samsung":
          return require("@/assets/samsung.svg");
        case "skhynix":
          return require("@/assets/skhynix.svg");
        case "spectek":
          return require("@/assets/spectek.gif");
        case "westerndigital":
          return require("@/assets/wd.svg");
        case "kioxia":
          return require("@/assets/kioxia.svg");
        default:
          return "";
      }
    },
    copy(item) {
      this.c(item.name + ": " + item.value);
    },
    copyAll() {
      var data = "";
      for (var info in this.extraInfo) {
        info = this.extraInfo[info];
        data += info.name + ": " + info.value + ", ";
      }
      this.c(data.substring(0, data.length - 2));
    },
    c(t) {
      this.$copyText(t).then(
        e => {
          this.snackbar = {
            timeout: 3000,
            show: true,
            text: this.$t("copySucc")
          };
        },
        e => {
          this.snackbar = {
            timeout: 3000,
            show: true,
            text: this.$t("copyFail", [e])
          };
        }
      );
    },
    copyAllFlashIds() {
      var data = "";
      for (var id in this.flashIds) {
        id = this.flashIds[id];
        data += id.id + ", ";
      }
      this.c(data.substring(0, data.length - 2));
    },
    copyFlashId(item) {
      this.c(item.id);
    },
    searchFlashId(item) {},
    search() {}
  },
  created: function() {
    if (Object.keys(this.$route.query).includes("pn")) {
      this.partNumber = this.$route.query.pn;
      this.query();
    }
  }
};
</script>
