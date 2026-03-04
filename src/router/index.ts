import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public routes
    {
      path: '/login',
      component: () => import('@/pages/login.vue'),
    },
    {
      path: '/register',
      component: () => import('@/pages/register.vue'),
    },
    {
      path: '/reset-password',
      component: () => import('@/pages/reset-password.vue'),
    },
    // Protected routes
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

// Route guard for authentication and onboarding
router.beforeEach(async (to, from) => {
  const { isAuthenticated, loading, checkOnboarding } = useAuth()

  // Wait for auth initialization
  if (loading.value) {
    await new Promise<void>((resolve) => {
      // Poll every 50ms until loading is false
      const interval = setInterval(() => {
        if (!loading.value) {
          clearInterval(interval)
          resolve()
        }
      }, 50)
    })
  }

  const publicRoutes = ['/login', '/register', '/reset-password']
  const isPublicRoute = publicRoutes.includes(to.path)

  // Not authenticated → redirect to login
  if (!isAuthenticated.value && !isPublicRoute) {
    return '/login'
  }

  // Authenticated on auth page → redirect to app
  if (isAuthenticated.value && isPublicRoute) {
    const needsOnboarding = await checkOnboarding()
    return needsOnboarding ? '/style-library' : '/'
  }

  // Check onboarding only after login/register
  if (isAuthenticated.value && (from.path === '/login' || from.path === '/register')) {
    const needsOnboarding = await checkOnboarding()
    if (needsOnboarding && to.path !== '/style-library') {
      return '/style-library'
    }
  }

  return true
})

export default router
