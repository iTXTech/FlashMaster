<template>
    <v-container grid-list-xl fluid>
        <v-layout row wrap>
            <v-flex lg4 sm12 xs12>
                <v-card>
                    <v-card-title>{{$t('partNumberOrFlashId')}}</v-card-title>
                    <v-card-text>
                        <v-text-field clearable class="pn" v-model="partNumber" v-on:keyup.enter="query"/>
                    </v-card-text>
                    <v-card-actions>
                        <v-btn text @click="query">{{$t("query")}}</v-btn>
                        <v-btn text @click="search">{{$t("search")}}</v-btn>
                        <v-btn text @click="searchId">{{$t("searchId")}}</v-btn>
                    </v-card-actions>
                </v-card>
            </v-flex>

            <v-flex lg2 sm12 xs12>
                <v-card>
                    <v-card-title>{{$t('vendor')}}</v-card-title>
                    <v-card-text>
                        <v-img :src="vendorLogo"/>
                        <v-text-field v-model="vendor">美光</v-text-field>
                    </v-card-text>
                </v-card>
            </v-flex>

            <v-flex lg2 sm12 xs12>
                <v-card>
                    <v-card-text>
                        <v-text-field :label="$t('type')" v-model="type"/>
                        <v-text-field :label="$t('density')" v-model="density"/>
                        <v-text-field :label="$t('deviceWidth')" v-model="deviceWidth"/>
                        <v-text-field :label="$t('cellLevel')" v-model="cellLevel"/>
                    </v-card-text>
                </v-card>
            </v-flex>

            <v-flex lg2 sm12 xs12>
                <v-card>
                    <v-card-text>
                        <v-text-field :label="$t('processNode')" v-model="processNode"/>
                        <v-text-field :label="$t('generation')" v-model="generation"/>
                        <v-checkbox disabled :label="$t('sync')" v-model="sync"/>
                        <v-checkbox disabled :label="$t('async')" v-model="async"/>
                    </v-card-text>
                </v-card>
            </v-flex>

            <v-flex lg2 sm12 xs12>
                <v-card>
                    <v-card-text>
                        <v-text-field :label="$t('ce')" v-model="ce"/>
                        <v-text-field :label="$t('ch')" v-model="ch"/>
                        <v-text-field :label="$t('die')" v-model="die"/>
                        <v-text-field :label="$t('rb')" v-model="rb"/>
                    </v-card-text>
                </v-card>
            </v-flex>

            <v-flex lg5 sm12 xs12>
                <v-card>
                    <v-card-text>
                        <v-text-field :label="$t('voltage')" v-model="voltage"/>
                        <v-text-field :label="$t('package')" v-model="pkg"/>
                        <v-textarea auto-grow rows="1" :label="$t('controllers')" v-model="controllers"/>
                        <v-text-field :label="$t('comment')" v-model="comment"/>
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
                                no-data-text=""
                                class="elevation-1"
                                :mobile-breakpoint="NaN"
                                :items-per-page="itemsPerPage"
                        >
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
                                no-data-text=""
                                :mobile-breakpoint="NaN"
                                :items-per-page="itemsPerPage"
                        >
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
</template>
<script>
    import store from "@/store";
    import router from "@/router";
    import bus from "@/store/bus.js";

    export default {
        data() {
            return {
                itemsPerPage: 10000,
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
                extraInfo: [],
                flashIds: []
            };
        },
        computed: {
            extraInfoHeaders() {
                return [
                    {text: this.$t("name"), value: "name", align: "left"},
                    {text: this.$t("value"), value: "value"},
                    {text: this.$t("copy"), value: "copy"}
                ];
            },
            flashIdHeaders() {
                return [
                    {text: this.$t("flashIds"), value: "id", align: "left"},
                    {text: this.$t("action"), value: "action"}
                ];
            }
        },
        methods: {
            query() {
                if (this.partNumber != null && this.partNumber !== "") {
                    this.partNumber = this.partNumber
                        .toUpperCase()
                        .replace(/,/g, "")
                        .replace(/ /g, "");
                    if (this.$route.query.pn !== this.partNumber) {
                        router.push({
                            path: "/decode",
                            query: {pn: this.partNumber}
                        });
                    }
                    bus.$emit("loading", true);
                    fetch(
                        store.getServerAddress() +
                        "/decode?trans=" +
                        store.autoTranslation() +
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
                            if (data.extraInfo != null && typeof data.extraInfo !== "string") {
                                for (let extraInfo in data.extraInfo) {
                                    this.extraInfo.push({
                                        name: extraInfo,
                                        value: data.extraInfo[extraInfo]
                                    });
                                }
                            }

                            this.flashIds = [];
                            if (data.flashId != null && typeof data.flashId !== "string") {
                                for (let flashId in data.flashId) {
                                    this.flashIds.push({
                                        id: data.flashId[flashId]
                                    });
                                }
                            }
                            bus.$emit("loading", false);
                            store.statDecodeIdInc();
                        })
                        .catch(err => {
                            bus.$emit("snackbar", {
                                timeout: 3000,
                                show: true,
                                text: this.$t("alert.fetchFailed", [err])
                            });
                            bus.$emit("loading", false);
                        });
                } else {
                    bus.$emit("snackbar", {
                        timeout: 3000,
                        show: true,
                        text: this.$t("alert.missingPartNumber")
                    });
                }
            },
            isUnknown(v) {
                return v === -2 ? 2 : v === -1 ? this.$t("unknown") : v;
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
                let data = "";
                for (let info in this.extraInfo) {
                    info = this.extraInfo[info];
                    data += info.name + ": " + info.value + ", ";
                }
                this.c(data.substring(0, data.length - 2));
            },
            c(t) {
                this.$copyText(t).then(
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
            copyAllFlashIds() {
                let data = "";
                for (let id in this.flashIds) {
                    id = this.flashIds[id];
                    data += id.id + ", ";
                }
                this.c(data.substring(0, data.length - 2));
            },
            copyFlashId(item) {
                this.c(item.id);
            },
            search() {
                if (this.partNumber != null && this.partNumber !== "") {
                    router.push({
                        path: "/searchPn",
                        query: {pn: this.partNumber}
                    });
                } else {
                    bus.$emit("snackbar", {
                        timeout: 3000,
                        show: true,
                        text: this.$t("alert.missingPartNumber")
                    });
                }
            },
            searchId() {
                if (this.partNumber != null && this.partNumber !== "") {
                    router.push({
                        path: "/searchId",
                        query: {id: this.partNumber}
                    });
                } else {
                    bus.$emit("snackbar", {
                        timeout: 3000,
                        show: true,
                        text: this.$t("alert.missingFlashId")
                    });
                }
            },
            searchFlashId(item) {
                router.push({
                    path: "/searchId",
                    query: {id: item.id}
                });
            }
        },
        created: function () {
            if (Object.keys(this.$route.query).includes("pn")) {
                this.partNumber = this.$route.query.pn;
                this.query();
            }
        }
    };
</script>