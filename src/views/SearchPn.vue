<template>
  <v-container grid-list-xl fluid>
    <v-flex lg12>
      <v-card>
        <v-app-bar flat dense color="transparent">
          <v-text-field
            flat
            solo
            clearable
            prepend-icon="mdi-magnify"
            :placeholder="$t('partNumber')"
            v-model="partNumber"
            hide-details
            class="pn"
            v-on:keyup.enter="search"
          ></v-text-field>
          <v-btn icon @click="search">
            <v-icon>mdi-arrow-right</v-icon>
          </v-btn>
        </v-app-bar>
        <v-divider></v-divider>
        <v-card-text>
          <v-data-table
            :headers="pnHeaders"
            :items="pns"
            disable-sort
            class="elevation-1"
            no-data-text
            hide-default-footer
            :items-per-page="itemsPerPage"
            :mobile-breakpoint="NaN"
          >
            <template v-slot:item.action="{ item }">
              <v-btn icon @click="decodeFlashId(item)">
                <v-icon>mdi-arrow-top-left-thick</v-icon>
              </v-btn>
              <v-btn icon @click="copyFlashId(item)">
                <v-icon>mdi-content-copy</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-flex>
  </v-container>
</template>
<script>
import store from "@/store";
import router from "@/router";
import bus from "@/store/bus.js";
export default {
  data: () => {
    return {
      itemsPerPage: 10000,
      snackbar: {
        timeout: 1000,
        show: false,
        text: ""
      },
      partNumber: "",
      pns: []
    };
  },
  computed: {
    pnHeaders() {
      return [
        { text: this.$t("vendor"), value: "vendor", align: "left" },
        { text: this.$t("partNumber"), value: "pn", align: "left" },
        { text: this.$t("action"), value: "action" }
      ];
    }
  },
  methods: {
    search() {
      if (this.partNumber != null && this.partNumber != "") {
        this.partNumber = this.partNumber
          .toUpperCase()
          .replace(/,/g, "")
          .replace(/ /g, "");
        if (this.$route.query.pn != this.partNumber) {
          router.push({
            path: "/searchPn",
            query: { pn: this.partNumber }
          });
        }
        fetch(store.getServerAddress() + "/searchPn?pn=" + this.partNumber)
          .then(r => r.json())
          .then(data => {
            this.pns = [];
            for (var d in data.data) {
              var pn = String(data.data[d]).split(" ");
              this.pns.push({
                vendor: this.$t("vendors." + pn[0]),
                pn: pn[1]
              });
            }
          })
          .catch(err => {
            bus.$emit("snackbar", {
              timeout: 3000,
              show: true,
              text: this.$t("alert.fetchFailed", [err])
            });
          });
      } else {
        bus.$emit("snackbar", {
          timeout: 3000,
          show: true,
          text: this.$t("alert.missingPartNumber")
        });
      }
    },
    copyFlashId(item) {
      this.$copyText(item.pn).then(
        e => {
          bus.$emit("snackbar", {
            timeout: 3000,
            show: true,
            text: this.$t("copySucc")
          });
        },
        e => {
          bus.$emit("snackbar", {
            timeout: 3000,
            show: true,
            text: this.$t("copyFail", [e])
          });
        }
      );
    },
    decodeFlashId(item) {
      router.push({
        path: "/decode",
        query: { pn: item.pn }
      });
    }
  },
  created: function() {
    if (Object.keys(this.$route.query).includes("pn")) {
      this.partNumber = this.$route.query.pn;
      this.search();
    }
  }
};
</script>
