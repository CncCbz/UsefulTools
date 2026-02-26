import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/store',
      name: 'plugin-store',
      component: () => import('../views/PluginStoreView.vue'),
    },
  ],
})

export default router
