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
                            :placeholder="$t('flashId')"
                            v-model="id"
                            hide-details
                            class="pn"
                            v-on:keyup.enter="search"
                    />
                    <v-btn icon @click="search">
                        <v-icon>mdi-arrow-right</v-icon>
                    </v-btn>
                </v-app-bar>
                <v-divider/>
                <v-card-text>
                    <v-data-table
                            :headers="idHeaders"
                            :items="ids"
                            disable-sort
                            class="elevation-1"
                            no-data-text=""
                            :mobile-breakpoint="NaN"
                            :items-per-page="15"
                            :footer-props="{
                                showFirstLastPage: true,
                                itemsPerPageOptions: [15, 30, 50, 100]
                            }"
                    >
                        <template v-slot:item.action="{ item }">
                            <v-menu offset-y>
                                <template v-slot:activator="{ on }">
                                    <v-btn icon v-on="on">
                                        <v-icon>mdi-animation</v-icon>
                                    </v-btn>
                                </template>
                                <v-list>
                                    <v-list-item v-for="(it, index) in item.rawPns" :key="index" @click="list(it)">
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
        data: () => {
            return {
                id: "",
                ids: [],
                tids: []
            };
        },
        computed: {
            idHeaders() {
                return [
                    {text: this.$t("flashId"), value: "id", align: "left"},
                    {text: this.$t("partNumber"), value: "pns", align: "left"},
                    {text: this.$t("action"), value: "action"},
                    {text: this.$t("controllers"), value: "cons", aligh: "left"}
                ];
            }
        },
        methods: {
            search() {
                if (this.id != null && this.id !== "") {
                    this.id = this.id
                        .toUpperCase()
                        .replace(/,/g, "")
                        .replace(/ /g, "");
                    if (this.$route.query.id !== this.id) {
                        router.push({
                            path: "/searchId",
                            query: {id: this.id}
                        });
                    }
                    bus.$emit("loading", true);
                    fetch(store.getServerAddress() + "/searchId?id=" + this.id)
                        .then(r => r.json())
                        .then(data => {
                            this.tids = [];
                            for (let d in data.data) {
                                let pns = "";
                                let raw = [];
                                for (let pn in data.data[d]) {
                                    pns += String(data.data[d][pn]).split(" ")[1] + ", ";
                                    raw.push(String(data.data[d][pn]).split(" ")[1]);
                                }
                                pns = pns.substring(0, pns.length - 2);
                                this.tids.push({
                                    id: d,
                                    pns: pns,
                                    rawPns: raw
                                });
                            }
                            fetch(store.getServerAddress() + "/searchController?id=" + this.id)
                                .then(r => r.json())
                                .then(data => {
                                    let i = 0;
                                    for (let d in data.data) {
                                        let cons = "";
                                        for (let con in data.data[d]) {
                                            cons += String(data.data[d][con]) + ", ";
                                        }
                                        cons = cons.substring(0, cons.length - 2);
                                        this.tids[i].cons = cons;
                                        i++;
                                    }
                                    this.ids = this.tids;
                                    bus.$emit("loading", false);
                                    store.statSearchIdInc();
                                });
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
                        text: this.$t("alert.missingFlashId")
                    });
                }
            },
            list(item) {
                router.push({
                    path: "/decode",
                    query: {pn: item}
                });
            }
        },
        created: function () {
            if (Object.keys(this.$route.query).includes("id")) {
                this.id = this.$route.query.id;
                this.search();
            }
        }
    };
</script>
