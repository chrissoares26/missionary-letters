import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/pages/(dashboard).vue'),
    },
    {
      path: '/missionaries',
      component: () => import('@/pages/missionaries.vue'),
    },
    {
      path: '/style-library',
      component: () => import('@/pages/style-library.vue'),
    },
    // /campaigns/new must be declared before /campaigns/:id
    {
      path: '/campaigns/new',
      component: () => import('@/pages/campaigns/new.vue'),
    },
    {
      path: '/campaigns/:id',
      component: () => import('@/pages/campaigns/[id].vue'),
    },
    {
      path: '/settings',
      component: () => import('@/pages/settings.vue'),
    },
  ],
})

export default router
