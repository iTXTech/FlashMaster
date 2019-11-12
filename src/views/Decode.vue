<template>
  <v-container grid-list-xl fluid>
    <v-layout row wrap>
      <v-flex lg3 sm12 xs12>
        <v-card>
          <v-card-title>{{$t('partNumber')}}</v-card-title>
          <v-card-text>
            <v-text-field required class="pn" v-model="partNumber" />
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
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>
<style>
.pn input {
  text-transform: uppercase;
}
</style>
<script>
import Store from "@/store";
import router from "@/router";
export default {
  data() {
    return {
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
      rawVendor: ""
    };
  },
  methods: {
    query() {
      if (this.partNumber != "") {
        if (this.$route.query.pn != this.partNumber) {
          router.push({
            path: "/decode",
            query: { pn: this.partNumber.toUpperCase() }
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

            if (Object.keys(data.interface).includes("toggle")) {
              this.sync = data.interface.toggle;
              this.async = true;
            } else {
              this.sync = data.interface.sync;
              this.async = data.interface.async;
            }

            this.ce = this.isUnknown(data.classification.ce);
            this.ch = this.isUnknown(data.classification.ch);
            this.die = this.isUnknown(data.classification.die);
            this.rb = this.isUnknown(data.classification.rnb);
          })
          .catch(err => {
            alert(this.$t("alert.fetchFailed", [err]));
          });
      } else {
        alert(this.$t("alert.missingPartNumber"));
      }
    },
    search() {},
    isUnknown(v) {
      return v == -1 ? this.$t("unknown") : v;
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
    }
  },
  created: function() {
    if (Object.keys(this.$route.query).includes("pn")) {
      this.partNumber = this.$route.query.pn;
      this.query();
    }
  }
};
</script>
