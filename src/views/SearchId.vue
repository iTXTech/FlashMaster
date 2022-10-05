<template>
  <v-container grid-list-xl fluid>
    <v-flex lg12>
      <v-card class="fm-bg">
        <v-app-bar flat dense color="transparent">
          <v-text-field
              flat
              solo
              clearable
              prepend-icon="mdi-magnify"
              :placeholder="$t('flashId')"
              v-model="id"
              hide-details
              class="pn"
              v-on:keyup.enter="search"
              ref="idInput"
              :loading="loading"
              background-color="transparent"
          />
          <v-btn icon v-on:click="search">
            <v-icon>mdi-arrow-right</v-icon>
          </v-btn>
        </v-app-bar>
        <v-divider />
        <v-card-text>
          <v-data-table
              :headers="idHeaders"
              :items="ids"
              disable-sort
              class="elevation-1 fm-bg"
              no-data-text=""
              :mobile-breakpoint="NaN"
              :items-per-page="15"
              :page.sync="page"
              :footer-props="{
                                showFirstLastPage: true,
                                itemsPerPageOptions: [15, 30, 50, 100]
                            }"
          >
            <template v-slot:item.action="{ item }">
              <v-btn icon v-on:click="decodeFlashId(item)">
                <v-icon>mdi-arrow-top-left-thick</v-icon>
              </v-btn>
              <v-menu offset-y>
                <template v-slot:activator="{ on }">
                  <v-btn icon v-on="on">
                    <v-icon>mdi-animation</v-icon>
                  </v-btn>
                </template>
                <v-list>
                  <v-list-item v-for="(it, index) in item.partNumberList" :key="index"
                               v-on:click="list(it)">
                    <v-list-item-action class="mx-0">{{ it }}</v-list-item-action>
                  </v-list-item>
                </v-list>
              </v-menu>
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
  data() {
    return {
      id: "",
      ids: [],
      page: 1,
      loading: false
    };
  },
  computed: {
    idHeaders() {
      return [
        { text: this.$t("flashId"), value: "id", align: "left" },
        { text: this.$t("pageSize"), value: "pageSize", align: "left" },
        { text: this.$t("blocks"), value: "blocks", align: "left" },
        { text: this.$t("pagesPerBlock"), value: "pagesPerBlock", align: "left" },
        { text: this.$t("partNumber"), value: "partNumbers", align: "left" },
        { text: this.$t("action"), value: "action" },
        { text: this.$t("controllers"), value: "controllers", align: "left" }
      ];
    }
  },
  methods: {
    showLoading(open) {
      if (open === false) {
        this.loading = false
      } else {
        this.loading = "primary"
      }
    },
    decodeFlashId(item) {
      router.push({
        path: "/decodeId",
        query: { id: item.id }
      });
    },
    search() {
      if (this.id != null && this.id !== "") {
        if (store.isAutoHideSoftKeyboard()) {
          setTimeout(() => {
            this.$refs.idInput.blur();
          });
        }
        this.id = store.partNumberFormat(this.id);
        if (this.$route.query.id !== this.id) {
          router.push({
            path: "/searchId",
            query: { id: this.id }
          });
        }
        this.page = 1;
        this.showLoading(true);
        fetch(`${store.getServerAddress()}/searchId?lang=${store.getLang()}&id=${this.id}`)
            .then(r => r.json())
            .then(data => {
              this.ids = [];
              for (let d in data.data) {
                let pns = "";
                let pnList = [];
                for (let pn in data.data[d]["partNumbers"]) {
                  pns += String(data.data[d]["partNumbers"][pn]).split(" ")[1] + ", ";
                  pnList.push(String(data.data[d]["partNumbers"][pn]).split(" ")[1]);
                }
                let cons = "";
                for (let con in data.data[d]["controllers"]) {
                  cons += String(data.data[d]["controllers"][con]) + ", ";
                }
                cons = cons.substring(0, cons.length - 2);
                pns = pns.substring(0, pns.length - 2);
                this.ids.push({
                  id: d,
                  partNumbers: pns,
                  partNumberList: pnList,
                  pageSize: data.data[d]["pageSize"],
                  blocks: data.data[d]["blocks"],
                  pagesPerBlock: data.data[d]["pagesPerBlock"],
                  controllers: cons
                });
              }
              this.showLoading(false);
              store.statSearchIdInc();
            })
            .catch(err => {
              bus.$emit("snackbar", {
                timeout: 3000,
                show: true,
                text: this.$t("alert.fetchFailed", [err])
              });
              this.showLoading(false);
            });
      } else {
        bus.$emit("snackbar", {
          timeout: 3000,
          show: true,
          text: this.$t("alert.missingFlashId")
        });
      }
    },
    list(item) {
      router.push({
        path: "/decode",
        query: { pn: item }
      });
    }
  },
  created() {
    if (Object.keys(this.$route.query).includes("id")) {
      this.id = this.$route.query.id;
      this.search();
    } else {
      setTimeout(() => {
        this.$refs.idInput.$refs.input.focus()
      })
    }
  }
};
</script>
