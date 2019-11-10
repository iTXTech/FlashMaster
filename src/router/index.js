import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: "/",
    component: () => import("@/views/Decode")
  },
  {
    path: "/decode",
    component: () => import("@/views/Decode")
  },
  {
    path: "/about",
    component: () => import("@/views/About")
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  scrollBehavior: () => ({ y: 0 }),
  routes
})

export default router
