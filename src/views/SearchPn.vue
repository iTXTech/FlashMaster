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
                            ref="pnInput"
                            v-bind:loading="loading"
                    />
                    <v-btn icon v-on:click="search">
                        <v-icon>mdi-arrow-right</v-icon>
                    </v-btn>
                </v-app-bar>
                <v-divider/>
                <v-card-text>
                    <v-data-table
                            :headers="pnHeaders"
                            :items="pns"
                            disable-sort
                            class="elevation-1"
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
                snackbar: {
                    timeout: 1000,
                    show: false,
                    text: ""
                },
                partNumber: "",
                pns: [],
                page: 1,
                loading: false
            };
        },
        computed: {
            pnHeaders() {
                return [
                    {text: this.$t("vendor"), value: "vendor", align: "left"},
                    {text: this.$t("partNumber"), value: "pn", align: "left"},
                    {text: this.$t("remark"), value: "remark", align: "left"},
                    {text: this.$t("action"), value: "action"}
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
            search() {
                if (this.partNumber != null && this.partNumber !== "") {
                    this.partNumber = this.partNumber
                        .toUpperCase()
                        .replace(/,/g, "")
                        .replace(/ /g, "");
                    if (this.$route.query.pn !== this.partNumber) {
                        router.push({
                            path: "/searchPn",
                            query: {pn: this.partNumber}
                        });
                    }
                    this.page = 1;
                    this.showLoading(true);
                    fetch(store.getServerAddress() + "/searchPn?lang=" + store.getLang() + "&pn=" + this.partNumber)
                        .then(r => r.json())
                        .then(data => {
                            this.pns = [];
                            for (let d in data.data) {
                                let pn = String(data.data[d]).split(" ");
                                this.pns.push({
                                    vendor: pn[0],
                                    pn: pn[1],
                                    remark: pn[2]
                                });
                            }
                            this.showLoading(false);
                            store.statSearchPnInc();
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
                        text: this.$t("alert.missingPartNumber")
                    });
                }
            },
            decodeFlashId(item) {
                router.push({
                    path: "/decode",
                    query: {pn: item.pn}
                });
            }
        },
        created: function () {
            if (Object.keys(this.$route.query).includes("pn")) {
                this.partNumber = this.$route.query.pn;
                this.search();
            } else {
                setTimeout(() => {
                    this.$refs.pnInput.$refs.input.focus()
                })
            }
        }
    };
</script>
