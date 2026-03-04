<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import FormInput from '@/components/ui/FormInput.vue'
import FormButton from '@/components/ui/FormButton.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { getAuthErrorMessage, fieldErrors } from '@/utils/authErrors'

const router = useRouter()
const { signIn } = useAuth()
const { error: showToastError } = useToast()

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const isSubmitting = ref(false)

function validateEmail(): boolean {
  if (!email.value) {
    emailError.value = fieldErrors.emailRequired
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    emailError.value = fieldErrors.emailInvalid
    return false
  }

  emailError.value = ''
  return true
}

function validatePassword(): boolean {
  if (!password.value) {
    passwordError.value = fieldErrors.passwordRequired
    return false
  }

  if (password.value.length < 6) {
    passwordError.value = 'A senha deve ter pelo menos 6 caracteres'
    return false
  }

  passwordError.value = ''
  return true
}

async function handleSubmit() {
  // Clear previous errors
  emailError.value = ''
  passwordError.value = ''

  // Validate fields
  const isEmailValid = validateEmail()
  const isPasswordValid = validatePassword()

  if (!isEmailValid || !isPasswordValid) {
    return
  }

  isSubmitting.value = true

  try {
    const { error } = await signIn(email.value, password.value)

    if (error) {
      showToastError(getAuthErrorMessage(error))
      return
    }

    // Redirect to dashboard - router guard will handle onboarding redirect
    router.push('/')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-full items-center justify-center px-4 py-12">
    <div class="w-full max-w-md space-y-8">
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-ink-900">
          Missionary Monday
        </h1>
        <p class="mt-2 text-sm text-stone-600">
          Entre com sua conta
        </p>
      </div>

      <!-- Form -->
      <form
        class="mt-8 space-y-6 rounded-xl bg-white p-8 shadow-sm"
        @submit.prevent="handleSubmit"
      >
        <div class="space-y-4">
          <FormInput
            v-model="email"
            type="email"
            label="E-mail"
            placeholder="seu@email.com"
            required
            :error="emailError"
            @blur="validateEmail"
          />

          <FormInput
            v-model="password"
            type="password"
            label="Senha"
            placeholder="••••••••"
            required
            :error="passwordError"
            @blur="validatePassword"
          />
        </div>

        <div class="flex items-center justify-end">
          <RouterLink
            to="/reset-password"
            class="text-sm text-forest-600 hover:text-forest-700"
          >
            Esqueci minha senha
          </RouterLink>
        </div>

        <FormButton
          type="submit"
          variant="primary"
          :loading="isSubmitting"
          class="w-full"
        >
          Entrar
        </FormButton>

        <p class="text-center text-sm text-stone-600">
          Não tem uma conta?
          <RouterLink
            to="/register"
            class="font-medium text-forest-600 hover:text-forest-700"
          >
            Cadastre-se
          </RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>
