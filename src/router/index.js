import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
    {
        path: "/",
        redirect: "/decode"
    },
    {
        path: "/decode",
        component: () => import("@/views/Decode.vue"),
        meta: {
            title: 'nav.decodePartNumber'
        }
    },
    {
        path: "/decodeId",
        component: () => import("@/views/DecodeId.vue"),
        meta: {
            title: 'nav.decodeId'
        }
    },
    {
        path: "/settings",
        component: () => import("@/views/Settings.vue"),
        meta: {
            title: 'nav.settings'
        }
    },
    {
        path: "/searchPn",
        component: () => import("@/views/SearchPn.vue"),
        meta: {
            title: 'nav.searchPartNumber'
        }
    },
    {
        path: '/searchId',
        component: () => import("@/views/SearchId.vue"),
        meta: {
            title: 'nav.searchFlashId'
        }
    },
    {
        path: "/about",
        component: () => import("@/views/About.vue"),
        meta: {
            title: 'nav.about'
        }
    },
];

const router = createRouter({
    history: createWebHashHistory(import.meta.env.BASE_URL),
    scrollBehavior: () => ({top: 0}),
    routes
});

export default router
