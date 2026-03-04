import { ref } from 'vue'

interface ToastMessage {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

const toasts = ref<ToastMessage[]>([])
let nextId = 0

export function useToast() {
  function showToast(
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    duration = 5000,
  ) {
    const id = nextId++
    toasts.value.push({ id, message, type, duration })
  }

  function removeToast(id: number) {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  function success(message: string, duration?: number) {
    showToast(message, 'success', duration)
  }

  function error(message: string, duration?: number) {
    showToast(message, 'error', duration)
  }

  function info(message: string, duration?: number) {
    showToast(message, 'info', duration)
  }

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    info,
  }
}
