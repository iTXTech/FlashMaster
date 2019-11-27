import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter);

const routes = [
    {
        path: "/",
        redirect: "/decode"
    },
    {
        path: "/decode",
        component: () => import("@/views/Decode"),
        meta: {
            title: 'nav.decodePartNumber'
        }
    },
    {
        path: "/settings",
        component: () => import("@/views/Settings"),
        meta: {
            title: 'nav.settings'
        }
    },
    {
        path: "/searchPn",
        component: () => import("@/views/SearchPn"),
        meta: {
            title: 'nav.searchPartNumber'
        }
    },
    {
        path: '/searchId',
        component: () => import("@/views/SearchId"),
        meta: {
            title: 'nav.searchFlashId'
        }
    },
    {
        path: "/about",
        component: () => import("@/views/About"),
        meta: {
            title: 'nav.about'
        }
    },
];

const router = new VueRouter({
    mode: 'hash',
    base: process.env.BASE_URL,
    scrollBehavior: () => ({y: 0}),
    routes
});

export default router
