import { ref } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

const isVisible = ref(false)
const currentOptions = ref<ConfirmOptions>({ title: '', message: '' })
let resolvePromise: ((value: boolean) => void) | null = null

export function useConfirm() {
  function confirm(opts: ConfirmOptions): Promise<boolean> {
    currentOptions.value = opts
    isVisible.value = true
    return new Promise((resolve) => {
      resolvePromise = resolve
    })
  }

  function handleConfirm() {
    isVisible.value = false
    resolvePromise?.(true)
    resolvePromise = null
  }

  function handleCancel() {
    isVisible.value = false
    resolvePromise?.(false)
    resolvePromise = null
  }

  return {
    isVisible,
    currentOptions,
    confirm,
    handleConfirm,
    handleCancel,
  }
}
