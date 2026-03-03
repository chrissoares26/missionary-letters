import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '../App.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
}

describe('App', () => {
  it('renders the app shell with bottom navigation', async () => {
    const router = makeRouter()
    const wrapper = mount(App, {
      global: { plugins: [router] },
    })
    await router.isReady()

    expect(wrapper.find('nav[aria-label="Navegação principal"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Início')
    expect(wrapper.text()).toContain('Missionários')
    expect(wrapper.text()).toContain('Config.')
  })
})
