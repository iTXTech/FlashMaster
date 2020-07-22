<template>
    <v-container grid-list-xl fluid>
        <v-layout row wrap>
            <v-flex lg4 sm12 xs12>
                <v-card class="fm-bg">
                    <v-card-title>{{$t('settings.server')}}</v-card-title>
                    <v-card-text>
                        <v-combobox
                                :items="items"
                                :label="$t('settings.serverAddr')"
                                :return-object="false"
                                v-on:input="changeServer"
                                v-model="server"
                        />
                    </v-card-text>
                    <v-card-actions>
                        <v-btn color="accent" text v-on:click="serverInfo">{{$t('settings.serverInfo')}}</v-btn>
                    </v-card-actions>
                </v-card>
            </v-flex>

            <v-flex lg3 sm12 xs12>
                <v-card class="fm-bg">
                    <v-card-title>{{$t('customization.title')}}</v-card-title>
                    <v-card-text>
                        <v-select
                                :items="themes"
                                :return-object="false"
                                v-on:change="changeTheme"
                                :label="$t('customization.theme')"
                                v-model="currentTheme"
                        />
                        <v-checkbox
                                v-on:change="togHideKeyboard"
                                v-model="hideKeyboard"
                                :label="$t('customization.autoHideSoftKeyboard')"
                        />
                    </v-card-text>
                    <v-card-actions>
                    </v-card-actions>
                </v-card>
            </v-flex>

            <v-flex lg3 sm12 xs12>
                <v-card class="fm-bg">
                    <v-card-title>{{$t('statistic.title')}}</v-card-title>
                    <v-card-text v-html="statContent"/>
                    <v-card-actions>
                        <v-btn color="accent" text v-on:click="resetStat">{{$t('statistic.reset')}}</v-btn>
                    </v-card-actions>
                </v-card>
            </v-flex>
        </v-layout>

        <v-dialog v-model="dialog.show" max-width="500">
            <v-card class="fm-bg">
                <v-card-title class="headline">{{$t('settings.fdServerInfo')}}</v-card-title>
                <v-card-text v-html="dialog.text"/>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn color="accent" text v-on:click="dialog.show = false">{{$t('close')}}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>
<script>
    import store from "@/store";
    import bus from "@/store/bus.js";
    import theme from "@/theme";

    export default {
        computed: {
            items() {
                let s = [];
                if (this.servers !== []) {
                    for (let server in this.servers) {
                        s.push({
                            value: this.servers[server],
                            text: server
                        });
                    }
                }
                return s;
            },
            transStat() {
                return this.updateStat();
            },
            themes() {
                let data = [];
                for (let key in theme.THEMES) {
                    data.push({
                        text: this.$t(`customization.theme_${key}`),
                        value: key
                    })
                }
                return data;
            }
        },
        data() {
            return {
                servers: [],
                server: store.getServerAddress(),
                dialog: {
                    show: false,
                    text: ""
                },
                statContent: "",
                hideKeyboard: false,
                currentTheme: "0"
            };
        },
        created() {
            this.currentTheme = store.getTheme();
            this.hideKeyboard = store.isAutoHideSoftKeyboard();
            this.statContent = this.updateStat();
            fetch("https://raw.githubusercontent.com/PeratX/FlashMaster/master/servers.json")
                .then(r => r.json())
                .then(data => {
                    this.servers = data;
                })
                .catch(err => {
                    bus.$emit("snackbar", {
                        timeout: 3000,
                        show: true,
                        text: this.$t("alert.fetchServerListFailed", [err])
                    });
                });
        },
        methods: {
            changeTheme(theme) {
                store.setTheme(theme)
                bus.$emit("theme");
            },
            togHideKeyboard(value) {
                store.setAutoHideSoftKeyboard(value);
            },
            changeServer(server) {
                store.setServerAddress(server);
            },
            serverInfo() {
                fetch(store.getServerAddress() + "/info")
                    .then(r => r.json())
                    .then(data => {
                        this.dialog = {
                            show: true,
                            text: this.$t("settings.info", [
                                data.ver,
                                data.info.fdb.time,
                                data.info.flash_cnt,
                                data.info.id_cnt,
                                data.info.mdb_cnt,
                                String(data.info.fdb.controllers).replace(/,/g, ", ")
                            ])
                        };
                    })
                    .catch(err => {
                        bus.$emit("snackbar", {
                            timeout: 3000,
                            show: true,
                            text: this.$t("alert.fetchFailed", [err])
                        });
                    });
            },
            resetStat() {
                store.resetStat();
                this.statContent = this.updateStat();
                bus.$emit("snackbar", {
                    timeout: 3000,
                    show: true,
                    text: this.$t("statistic.resetInfo")
                });
            },
            updateStat() {
                return this.$t("statistic.content", [
                    store.statDecodeId(),
                    store.statSearchPn(),
                    store.statSearchId()
                ]);
            }
        },
        watch: {
            transStat(v) {
                this.statContent = v;
            }
        }
    };
</script>
