import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { tools } from '../data/tools'

const toolRoutes = tools.map(tool => ({
  path: tool.route,
  name: tool.id,
  component: tool.component,
}))

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    ...toolRoutes,
  ],
})

export default router

