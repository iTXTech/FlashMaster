import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: "/",
    redirect: "/decode"
  },
  {
    path: "/decode",
    component: () => import("@/views/Decode")
  },
  {
    path: "/about",
    component: () => import("@/views/About")
  },
  {
    path: "/settings",
    component: () => import("@/views/Settings")
  }
]

const router = new VueRouter({
  mode: 'hash',
  base: process.env.BASE_URL,
  scrollBehavior: () => ({ y: 0 }),
  routes
})

export default router
