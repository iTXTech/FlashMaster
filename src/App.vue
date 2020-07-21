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
    .fm-bg {
        background-color: var(--card-color) !important;
    }

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
    import themeManager from "@/theme";

    export default {
        data: () => {
            return {
                snackbar: {
                    timeout: 1000,
                    show: false,
                    text: ""
                },
                themeStyle: ""
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
                let t = store.getTheme();
                if (t === themeManager.THEME_SYSTEM) {
                    t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? themeManager.THEME_DARK : themeManager.THEME_LIGHT;
                }
                let theme = themeManager.THEMES[t];
                this.$vuetify.theme.dark = theme.dark;
                let color;
                if ("color" in theme) {
                    color = theme.color;
                } else {
                    color = themeManager.DEFAULT_COLOR;
                }
                for (let key in color) {
                    this.$vuetify.theme.themes[theme.dark ? "dark" : "light"][key] = color[key];
                }
                if ("style" in theme) {
                    this.themeStyle = theme.style;
                } else {
                    this.themeStyle = "";
                }
                this.themeStyle = "--card-color: " + theme.card + ";" + this.themeStyle;
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
            window.matchMedia('(prefers-color-scheme: dark)').addListener(e => {
                if (store.getTheme() === themeManager.THEME_SYSTEM) {
                    this.updateTheme();
                }
            });
            this.updateTheme();
        }
    };
</script>
