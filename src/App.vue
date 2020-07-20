<template>
    <v-app id="app" v-touch="{right: () => drawer(true), left: () => drawer(false)}">
        <Drawer/>
        <v-main>
            <router-view/>
        </v-main>
        <v-snackbar v-model="snackbar.show" :timeout="snackbar.timeout">
            {{snackbar.text}}
            <template v-slot:action="{ attrs }">
                <v-btn v-bind="attrs" text color="blue" v-on:click="snackbar.show = false">{{$t('close')}}</v-btn>
            </template>
        </v-snackbar>
    </v-app>
</template>
<style>
    .pn input {
        text-transform: uppercase;
    }

    div.v-application {
        display: block;
    }

    th {
        white-space: nowrap;
    }

    div.v-content__wrap {
        width: 100%;
    }
</style>
<script>
    import Drawer from "@/components/Drawer";
    import bus from "@/store/bus.js";
    import store from "@/store";

    export default {
        data: () => {
            return {
                snackbar: {
                    timeout: 1000,
                    show: false,
                    text: ""
                }
            };
        },
        components: {
            Drawer
        },
        computed: {
            translateEvent() {
                return this.$t("lang")
            }
        },
        methods: {
            drawer(v) {
                let path = this.$router.currentRoute.path;
                if (path !== "/searchId" && path !== "/searchPn") {
                    bus.$emit("drawer", v)
                }
            },
            updateTitle(meta) {
                if (meta.title) {
                    document.title = "FlashMaster - " + this.$t(meta.title);
                } else {
                    document.title = "iTXTech FlashMaster";
                }
            },
            updateTheme() {
                let theme = store.getTheme();
                switch (theme) {
                    case "0":
                        this.$vuetify.theme.dark = true;
                        break;
                    case "1":
                        this.$vuetify.theme.dark = false;
                        break;
                    case "2":
                        this.$vuetify.theme.dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                        break;
                }
            }
        },
        watch: {
            $route(to, from) {
                this.updateTitle(to.meta)
            },
            translateEvent() {
                this.updateTitle(this.$router.currentRoute.meta)
            }
        },
        mounted: function () {
            let vm = this;
            bus.$on("snackbar", data => {
                vm.snackbar = data;
            });
            bus.$on("theme", () => {
                vm.updateTheme();
            })
        },
        created() {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (store.getTheme() === "2") {
                    this.updateTheme();
                }
            });
            this.updateTheme();
        }
    };
</script>
