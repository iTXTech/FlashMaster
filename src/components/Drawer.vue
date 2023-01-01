<template>
    <v-container>
        <v-navigation-drawer v-model="drawer" :clipped="$vuetify.breakpoint.lgAndUp" app>
            <v-list-item>
                <v-list-item-content>
                    <v-list-item-title class="title">FlashMaster</v-list-item-title>
                    <v-list-item-subtitle>{{this.ver}}</v-list-item-subtitle>
                    <v-list-item-subtitle>by PeratX@iTXTech.org</v-list-item-subtitle>
                    <v-list-item-subtitle>{{$t('group')}}</v-list-item-subtitle>
                </v-list-item-content>
            </v-list-item>

            <v-divider/>
            <v-list dense nav>
                <v-list-item-group color="primary">
                    <v-list-item v-for="(item, i) in items" :key="i" :to="item.path">
                        <v-list-item-icon>
                            <v-icon v-text="item.icon"/>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title v-text="item.text"/>
                        </v-list-item-content>
                    </v-list-item>
                </v-list-item-group>
            </v-list>

            <v-footer absolute class="font-weight-medium">
                <v-col class="text-center" cols="12">
                    <h6>© 2019-2023 iTX Technologies</h6>
                </v-col>
            </v-footer>
        </v-navigation-drawer>

        <v-app-bar :clipped-left="$vuetify.breakpoint.lgAndUp" app :color="barColor" dark>
            <v-app-bar-nav-icon v-on:click.stop="drawer = !drawer"/>
            <v-img
                    alt="FlashMaster Logo"
                    :src="require('@/assets/logo.png')"
                    class="shrink mr-2"
                    contain
                    transition="scale-transition"
                    width="40"
            />
            <v-toolbar-title class="title">
                FlashMaster
            </v-toolbar-title>
            <v-spacer/>

            <v-menu offset-y>
                <template v-slot:activator="{ on }">
                    <v-btn text dark v-on="on">
                        <v-icon>mdi-earth</v-icon>
                    </v-btn>
                </template>
                <v-list>
                    <v-list-item v-for="(item, index) in langs" :key="index" v-on:click="changeLanguage(item.code)">
                        <v-list-item-title>{{ item.name }}</v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>
        </v-app-bar>
    </v-container>
</template>

<script>
    import store from "@/store";
    import bus from "@/store/bus.js";

    export default {
        props: {
            source: String
        },
        data() {
            return {
                dialog: false,
                drawer: false,
                barColor: "primary"
            }
        },
        mounted() {
            let vm = this;
            bus.$on("drawer", data => {
                vm.drawer = data;
            });
            bus.$on("barColor", color => {
                vm.barColor = color;
            })
        },
        computed: {
            ver() {
                return this.$t("version", [store.getProjectVersion()])
            },
            langs() {
                let lang = [];
                for (let msg in this.$i18n.messages) {
                    lang.push({
                        name: this.$i18n.messages[msg].lang,
                        code: msg
                    })
                }
                return lang
            },
            items() {
                return [
                    {
                        icon: "mdi-crosshairs-gps",
                        text: this.$t("nav.decodePartNumber"),
                        path: "/decode"
                    },
                    {
                        icon: "mdi-magnify",
                        text: this.$t("nav.searchPartNumber"),
                        path: "/searchPn"
                    },
                    {
                        icon: "mdi-book-open",
                        text: this.$t("nav.decodeId"),
                        path: "/decodeId"
                    },
                    {
                        icon: "mdi-flash",
                        text: this.$t("nav.searchFlashId"),
                        path: "/searchId"
                    },
                    {
                        icon: "mdi-cog-outline",
                        text: this.$t("nav.settings"),
                        path: "/settings"
                    },
                    {
                        icon: "mdi-information",
                        text: this.$t("nav.about"),
                        path: "/about"
                    }
                ];
            }
        },
        methods: {
            changeLanguage(item) {
                this.$i18n.locale = item;
                this.$vuetify.lang.current = item;
                localStorage.lang = item;
            }
        }
    };
</script>
