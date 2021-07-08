<template>
    <v-container grid-list-xl fluid>
        <v-layout row wrap>
            <v-flex lg4 sm12 xs12>
                <v-card class="fm-bg">
                    <v-app-bar flat dense color="transparent">
                        <v-toolbar-title>{{ $t('flashId') }}</v-toolbar-title>
                        <v-spacer/>
                    </v-app-bar>
                    <v-card-text>
                        <v-combobox
                            :items="searchedPns"
                            :return-object="false"
                            clearable
                            class="pn"
                            v-model="partNumber"
                            v-on:keyup.enter="query"
                            v-on:update:search-input="searchPnDirectly"
                            ref="pnInput"
                            no-filter
                            :loading="loading"
                        />
                    </v-card-text>
                    <v-card-actions>
                        <v-btn color="accent" text v-on:click="query">{{ $t("searchIdPage.query") }}</v-btn>
                        <v-btn color="accent" text v-on:click="search">{{ $t("searchIdPage.search") }}</v-btn>
                    </v-card-actions>
                </v-card>
            </v-flex>

            <v-flex lg2 sm12 xs12>
                <v-card class="fm-bg">
                    <v-card-title>{{ $t('vendor') }}</v-card-title>
                    <v-card-text>
                        <v-img :src="vendorLogo"/>
                        <v-text-field v-model="vendor"/>
                    </v-card-text>
                </v-card>
            </v-flex>

            <v-flex lg2 sm12 xs12>
                <v-card class="fm-bg">
                    <v-card-text>
                        <v-text-field :label="$t('cellLevel')" v-model="cellLevel"/>
                        <v-text-field :label="$t('density')" v-model="density"/>
                        <v-text-field :label="$t('processNode')" v-model="processNode"/>
                        <v-text-field :label="$t('pageSize')" v-model="pageSize"/>
                    </v-card-text>
                </v-card>
            </v-flex>

            <v-flex lg2 sm12 xs12>
                <v-card class="fm-bg">
                    <v-card-text>
                        <v-text-field :label="$t('die')" v-model="die"/>
                        <v-text-field :label="$t('plane')" v-model="plane"/>
                        <v-text-field :label="$t('blockSize')" v-model="blockSize"/>
                        <v-text-field :label="$t('voltage')" v-model="voltage"/>
                    </v-card-text>
                </v-card>
            </v-flex>

            <v-flex lg2 sm12 xs12>
                <v-card class="fm-bg">
                    <v-card-text>
                        <v-textarea auto-grow rows="1" :label="$t('controllers')" v-model="controllers"/>
                    </v-card-text>
                </v-card>
            </v-flex>

            <v-flex lg4 sm12 xs12>
                <v-card class="fm-bg">
                    <v-app-bar flat dense color="transparent">
                        <v-toolbar-title>{{ $t('extraInfo') }}</v-toolbar-title>
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
                            class="elevation-1 fm-bg"
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

            <v-flex lg4 sm12 xs12>
                <v-card class="fm-bg">
                    <v-app-bar flat dense color="transparent">
                        <v-toolbar-title>{{ $t('searchIdPage.pns') }}</v-toolbar-title>
                        <v-spacer/>
                        <v-btn icon v-on:click="copyAllFlashIds">
                            <v-icon>mdi-content-copy</v-icon>
                        </v-btn>
                    </v-app-bar>
                    <v-card-text>
                        <v-data-table
                            :headers="flashIdHeaders"
                            :items="partNumbers"
                            hide-default-footer
                            disable-sort
                            class="elevation-1 fm-bg"
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

            <v-flex lg4 sm12 xs12>
                <v-card class="fm-bg">
                    <v-card-title>{{ $t('urls') }}</v-card-title>
                    <v-card-text>
                        <v-data-table
                            :headers="urlHeaders"
                            :items="urls"
                            hide-default-footer
                            disable-sort
                            class="elevation-1 fm-bg"
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
            <v-card class="fm-bg">
                <v-card-title class="headline">{{ $t('copyManually') }}</v-card-title>
                <v-card-text>
                    <v-textarea auto-grow rows="1" v-model="dialog.content"/>
                </v-card-text>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn color="accent" text v-on:click="copyFromDialog">{{ $t('copy') }}</v-btn>
                    <v-btn color="accent" text v-on:click="dialog.show = false">{{ $t('close') }}</v-btn>
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
            density: "",
            cellLevel: "",
            processNode: "",
            pageSize: "",
            blockSize: "",
            die: "",
            plane: "",
            voltage: "",
            rawVendor: "",
            controllers: "",
            extraInfo: [],
            partNumbers: [],
            urls: [],
            sum: "",
            searchedPns: [],
            loading: false
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
                {text: this.$t("vendor"), value: "vendor", align: "left"},
                {text: this.$t("partNumber"), value: "pn"},
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
            if (input == null) {
                return;
            }
            input = String(input).trim()
            this.partNumber = input;
            this.searchedPns = [];
            if (input.length >= 3) {
                fetch(`${store.getServerAddress()}/searchId?limit=10&lang=${store.getLang()}&id=${input}`)
                    .then(r => r.json())
                    .then(data => {
                        for (let d in data.data) {
                            this.searchedPns.push({
                                value: d,
                                text: d
                            });
                        }
                        this.$nextTick(() => {
                            if (this.$refs.pnInput.$refs.menu.$children.length > 0) {
                                let list = this.$refs.pnInput.$refs.menu.$children[0].$children[0]
                                list.$on("select", e => {
                                    this.partNumber = e.value;
                                    this.query();
                                })
                            }
                        });
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
                if (this.$route.query.id !== this.partNumber) {
                    router.push({
                        path: "/decodeId",
                        query: {id: this.partNumber}
                    });
                }
                this.showLoading(true);
                fetch(`${store.getServerAddress()}/decodeId?lang=${store.getLang()}&id=${this.partNumber}`)
                    .then(r => r.json())
                    .then(data => {
                        data = data.data;
                        this.vendor = data.vendor;
                        this.density = data.density;
                        this.cellLevel = data.cellLevel;
                        this.processNode = data.processNode;
                        this.pageSize = store.formatNumber(data.pageSize);
                        this.voltage = data.voltage;
                        this.blockSize = store.formatNumber(data.blockSize);
                        this.voltage = data.voltage;
                        this.die = data.die;
                        this.plane = data.plane;
                        this.rawVendor = data.rawVendor;
                        this.vendorLogo = this.getVendorLogo();
                        this.controllers = String(data.controllers).replace(/,/g, ", ");

                        this.extraInfo = [];
                        if (data.ext != null && typeof data.ext !== "string") {
                            for (let extraInfo in data.ext) {
                                this.extraInfo.push({
                                    name: extraInfo,
                                    value: data.ext[extraInfo]
                                });
                            }
                        }

                        this.partNumbers = [];
                        if (data.partNumbers != null && typeof data.partNumbers !== "string") {
                            for (let flashId in data.partNumbers) {
                                let pn = String(data.partNumbers[flashId]).split(" ");
                                this.partNumbers.push({
                                    vendor: pn[0],
                                    pn: pn[1]
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
                        store.statDecodeFidInc();
                    })
                    .catch(err => {
                        bus.$emit("snackbar", {
                            timeout: 3000,
                            show: true,
                            text: this.$t("alert.fetchFailed", [err])
                        });
                        this.showLoading(false);
                        console.error(err)
                    });
            } else {
                bus.$emit("snackbar", {
                    timeout: 3000,
                    show: true,
                    text: this.$t("alert.missingFlashId")
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
                case "ymtc":
                    return require("@/assets/ymtc.png");
                default:
                    return "";
            }
        },
        copy(item) {
            this.c(`${item.name}: ${item.value}`);
        },
        copyAll() {
            let data = "";
            for (let info in this.extraInfo) {
                info = this.extraInfo[info];
                data += `${info.name}: ${info.value}, `;
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
            for (let id in this.partNumbers) {
                id = this.partNumbers[id];
                data += `${id.pn}, `;
            }
            this.c(data.substring(0, data.length - 2));
        },
        copyFlashId(item) {
            this.c(item.pn);
        },
        search() {
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
                path: "/decode",
                query: {pn: item.pn}
            });
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
        if (Object.keys(this.$route.query).includes("id")) {
            this.partNumber = this.$route.query.id;
            this.query();
        } else {
            setTimeout(() => {
                this.$refs.pnInput.$refs.input.focus()
            })
        }
    }
};
</script>
