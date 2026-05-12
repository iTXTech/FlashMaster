import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';
import { ROUTER_MODE, ROUTER_MODE_HISTORY, ROUTE_NAMES } from '@/router/locations';

const localePrefix = '/:locale(en|zh)?';

const routes = [
    {
        path: "/",
        name: ROUTE_NAMES.root,
        redirect: { name: ROUTE_NAMES.parts }
    },
    {
        path: localePrefix,
        name: ROUTE_NAMES.localeRoot,
        redirect: to => ({
            name: ROUTE_NAMES.parts,
            params: to.params.locale ? { locale: to.params.locale } : {}
        })
    },
    {
        path: `${localePrefix}/parts/search/:query?`,
        name: ROUTE_NAMES.partsSearch,
        component: () => import("@/views/SearchPn.vue"),
        meta: {
            title: 'nav.searchPartNumber'
        }
    },
    {
        path: `${localePrefix}/parts/:pn`,
        name: ROUTE_NAMES.part,
        component: () => import("@/views/Decode.vue"),
        meta: {
            title: 'nav.decodePartNumber'
        }
    },
    {
        path: `${localePrefix}/parts`,
        name: ROUTE_NAMES.parts,
        component: () => import("@/views/Decode.vue"),
        meta: {
            title: 'nav.decodePartNumber'
        }
    },
    {
        path: `${localePrefix}/ids/search/:query?`,
        name: ROUTE_NAMES.idsSearch,
        component: () => import("@/views/SearchId.vue"),
        meta: {
            title: 'nav.searchFlashId'
        }
    },
    {
        path: `${localePrefix}/ids/:id`,
        name: ROUTE_NAMES.id,
        component: () => import("@/views/DecodeId.vue"),
        meta: {
            title: 'nav.decodeId'
        }
    },
    {
        path: `${localePrefix}/ids`,
        name: ROUTE_NAMES.ids,
        component: () => import("@/views/DecodeId.vue"),
        meta: {
            title: 'nav.decodeId'
        }
    },
    {
        path: `${localePrefix}/settings`,
        name: ROUTE_NAMES.settings,
        component: () => import("@/views/Settings.vue"),
        meta: {
            title: 'nav.settings'
        }
    },
    {
        path: `${localePrefix}/about`,
        name: ROUTE_NAMES.about,
        component: () => import("@/views/About.vue"),
        meta: {
            title: 'nav.about'
        }
    },
    {
        path: `${localePrefix}/:pathMatch(.*)*`,
        name: ROUTE_NAMES.notFound,
        component: () => import("@/views/NotFound.vue"),
        meta: {
            title: 'nav.notFound',
            robots: 'noindex, follow'
        }
    },
];

const createHistory = ROUTER_MODE === ROUTER_MODE_HISTORY ? createWebHistory : createWebHashHistory;

const router = createRouter({
    history: createHistory(import.meta.env.BASE_URL),
    scrollBehavior: () => ({top: 0}),
    routes
});

export default router
