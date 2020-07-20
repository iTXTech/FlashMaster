<template>
    <v-container grid-list-xl fluid>
        <v-layout row wrap>
            <v-flex lg4 sm12 xs12>
                <v-card>
                    <v-app-bar flat dense color="transparent">
                        <v-toolbar-title>{{$t('partNumberOrFlashId')}}</v-toolbar-title>
                        <v-spacer/>
                        <v-btn icon v-on:click="summary">
                            <v-icon>mdi-book-information-variant</v-icon>
                        </v-btn>
                    </v-app-bar>
                    <v-card-text>
                        <v-combobox
                                :items="searchedPns"
                                :return-object="false"
                                clearable
                                class="pn"
                                v-model="box"
                                v-on:keyup.enter="query"
                                v-on:update:search-input="searchPnDirectly"
                                ref="pnInput"
                                no-filter
                                v-bind:loading="loading"
                        />
                    </v-card-text>
                    <v-card-actions>
                        <v-btn text color="primary" v-on:click="query">{{$t("query")}}</v-btn>
                        <v-btn text color="primary" v-on:click="search">{{$t("search")}}</v-btn>
                        <v-btn text color="primary" v-on:click="searchId">{{$t("searchId")}}</v-btn>
                    </v-card-actions>
                </v-card>
            </v-flex>

            <v-flex lg2 sm12 xs12>
                <v-card>
                    <v-card-title>{{$t('vendor')}}</v-card-title>
                    <v-card-text>
                        <v-img :src="vendorLogo"/>
                        <v-text-field v-model="vendor"/>
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
                        <v-spacer/>
                        <v-btn icon v-on:click="copyAll">
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
                                <v-btn icon v-on:click="copy(item)">
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
                        <v-spacer/>
                        <v-btn icon v-on:click="copyAllFlashIds">
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
                                <v-btn icon v-on:click="searchFlashId(item)">
                                    <v-icon>mdi-magnify</v-icon>
                                </v-btn>
                                <v-btn icon v-on:click="copyFlashId(item)">
                                    <v-icon>mdi-content-copy</v-icon>
                                </v-btn>
                            </template>
                        </v-data-table>
                    </v-card-text>
                </v-card>
            </v-flex>

            <v-flex lg5 sm12 xs12>
                <v-card>
                    <v-card-title>{{$t('urls')}}</v-card-title>
                    <v-card-text>
                        <v-data-table
                                :headers="urlHeaders"
                                :items="urls"
                                hide-default-footer
                                disable-sort
                                class="elevation-1"
                                no-data-text=""
                                :mobile-breakpoint="NaN"
                                :items-per-page="itemsPerPage"
                        >
                            <template v-slot:item.action="{ item }">
                                <v-btn icon v-on:click="open(item.url)">
                                    <v-icon>mdi-open-in-new</v-icon>
                                </v-btn>
                            </template>
                        </v-data-table>
                    </v-card-text>
                </v-card>
            </v-flex>
        </v-layout>

        <v-dialog v-model="dialog.show" max-width="500">
            <v-card>
                <v-card-title class="headline">{{$t('copyManually')}}</v-card-title>
                <v-card-text>
                    <v-textarea auto-grow rows="1" v-model="dialog.content"/>
                </v-card-text>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn color="primary" text v-on:click="copyFromDialog">{{$t('copy')}}</v-btn>
                    <v-btn color="primary" text v-on:click="dialog.show = false">{{$t('close')}}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>
<script>
    import store from "@/store";
    import router from "@/router";
    import bus from "@/store/bus.js";

    export default {
        data() {
            return {
                dialog: {
                    show: false,
                    content: ""
                },
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
                flashIds: [],
                urls: [],
                sum: "",
                searchedPns: [],
                loading: false,
                box: ""
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
            },
            urlHeaders() {
                return [
                    {text: this.$t("description"), value: "description", align: "left"},
                    {text: this.$t("action"), value: "action"}
                ]
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
            searchPnDirectly(input) {
                input = String(input).trim()
                this.searchedPns = [];
                this.partNumber = input
                if (input.length >= 3) {
                    fetch(store.getServerAddress() + "/searchPn?limit=10&lang=" + store.getLang() + "&pn=" + input)
                        .then(r => r.json())
                        .then(data => {
                            for (let d in data.data) {
                                let pn = String(data.data[d]).split(" ");
                                this.searchedPns.push({
                                    value: pn[1],
                                    text: pn[0] + " / " + pn[1] + (pn[2] != null ? (" / " + pn[2]) : "")
                                });
                            }
                            setTimeout(() => {
                                if (this.$refs.pnInput.$refs.menu.$children.length > 0) {
                                    let list = this.$refs.pnInput.$refs.menu.$children[0].$children[0]
                                    list.$on("select", e => {
                                        this.box = e.value;
                                        this.partNumber = this.box;
                                        this.query();
                                    })
                                }
                            }, 100)
                        });
                }
            },
            processPn() {
                this.partNumber = store.partNumberFormat(this.partNumber);
            },
            query() {
                if (this.partNumber != null && this.partNumber !== "") {
                    setTimeout(() => {
                        this.$refs.pnInput.isMenuActive = false;
                        if (store.isAutoHideSoftKeyboard()) {
                            this.$refs.pnInput.blur();
                        }
                    });
                    this.processPn();
                    if (this.$route.query.pn !== this.partNumber) {
                        router.push({
                            path: "/decode",
                            query: {pn: this.partNumber}
                        });
                    }
                    this.showLoading(true);
                    fetch(store.getServerAddress() + "/decode?lang=" + store.getLang() + "&pn=" + this.partNumber)
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
                                this.ce = data.classification.ce;
                                this.ch = data.classification.ch;
                                this.die = data.classification.die;
                                this.rb = data.classification.rb;

                                if (this.ch === -2) {
                                    this.ch = 2;
                                }
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

                            this.urls = [];
                            if (data.url != null && typeof data.url !== "string") {
                                for (let url in data.url) {
                                    this.urls.push({
                                        description: url,
                                        url: data.url[url]
                                    })
                                }
                            }
                            this.showLoading(false);
                            store.statDecodeIdInc();
                        })
                        .catch(err => {
                            bus.$emit("snackbar", {
                                timeout: 3000,
                                show: true,
                                text: this.$t("alert.fetchFailed", [err])
                            });
                            this.showLoading(false);
                        });
                }
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
                            text: this.$t("copyFail")
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
            },
            summary() {
                if (this.partNumber != null && this.partNumber !== "") {
                    this.processPn();
                    this.showLoading(true);
                    fetch(store.getServerAddress() + "/summary?lang=" + store.getLang() + "&pn=" + this.partNumber)
                        .then(r => r.json())
                        .then(data => {
                            this.$copyText(data.data).then(
                                e => {
                                    bus.$emit("snackbar", {
                                        timeout: 3000,
                                        show: true,
                                        text: this.$t("copySucc")
                                    });
                                },
                                e => {
                                    this.dialog = {
                                        show: true,
                                        content: e.text
                                    }
                                }
                            );
                            this.showLoading(false);
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
            copyFromDialog() {
                this.$copyText(this.dialog.content).then(
                    e => {
                        bus.$emit("snackbar", {
                            timeout: 3000,
                            show: true,
                            text: this.$t("copySucc")
                        });
                        this.dialog.show = false;
                    },
                    e => {
                        bus.$emit("snackbar", {
                            timeout: 3000,
                            show: true,
                            text: this.$t("copySucc")
                        });
                    }
                );
            },
            open(url) {
                window.open(url, '_blank')
            }
        },
        created() {
            if (Object.keys(this.$route.query).includes("pn")) {
                this.box = this.$route.query.pn;
                this.partNumber = this.box
                this.query();
            } else {
                setTimeout(() => {
                    this.$refs.pnInput.$refs.input.focus()
                })
            }
        }
    };
</script>
