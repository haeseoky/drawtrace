import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomePage.vue'),
  },
  {
    path: '/draw-trace',
    name: 'DrawTrace',
    component: () => import('../views/DrawTracePage.vue'),
  },
  {
    path: '/reaction',
    name: 'Reaction',
    component: () => import('../views/ReactionPage.vue'),
  },
  {
    path: '/memory',
    name: 'Memory',
    component: () => import('../views/MemoryPage.vue'),
  },
  {
    path: '/color-match',
    name: 'ColorMatch',
    component: () => import('../views/ColorMatchPage.vue'),
  },
  {
    path: '/brick',
    name: 'BrickBreaker',
    component: () => import('../views/BrickBreakerPage.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
