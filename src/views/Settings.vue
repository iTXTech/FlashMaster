<template>
    <div>
        <v-container grid-list-xl fluid>
            <v-layout row wrap>
                <v-flex lg4 sm12 xs12>
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

                <v-flex lg3 sm12 xs12>
                    <v-card>
                        <v-card-title>{{$t('statistic.title')}}</v-card-title>
                        <v-card-text v-html="statContent"/>
                        <v-card-actions>
                            <v-btn text @click="resetStat">{{$t("statistic.reset")}}</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-flex>
            </v-layout>
        </v-container>

        <v-dialog v-model="dialog.show" max-width="500">
            <v-card>
                <v-card-title class="headline">{{$t('settings.fdServerInfo')}}</v-card-title>
                <v-card-text v-html="dialog.text"></v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="blue" text @click="dialog.show = false">{{$t('close')}}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>
<script>
    import store from "@/store";
    import bus from "@/store/bus.js";

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
            }
        },
        data() {
            return {
                servers: [],
                server: store.getServerAddress(),
                autoTrans: false,
                dialog: {
                    show: false,
                    text: ""
                },
                statContent: ""
            };
        },
        created: function () {
            this.statContent = this.updateStat();
            this.autoTrans = store.autoTranslation() === "1";
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
                store.setServerAddress(server);
            },
            changeTranslation(value) {
                store.setAutoTranslation(value);
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