<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import FormInput from '@/components/ui/FormInput.vue'
import FormButton from '@/components/ui/FormButton.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { getAuthErrorMessage, fieldErrors } from '@/utils/authErrors'

const router = useRouter()
const { signUp } = useAuth()
const { error: showToastError } = useToast()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const isSubmitting = ref(false)

// Password strength indicator
const passwordStrength = computed(() => {
  const pwd = password.value
  if (pwd.length === 0) return { level: 0, text: '', color: '' }
  if (pwd.length < 8) return { level: 1, text: 'Fraca', color: 'text-sunrise-600' }

  let strength = 0
  if (pwd.length >= 8) strength++
  if (pwd.length >= 12) strength++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++
  if (/\d/.test(pwd)) strength++
  if (/[^a-zA-Z0-9]/.test(pwd)) strength++

  if (strength <= 2) return { level: 1, text: 'Fraca', color: 'text-sunrise-600' }
  if (strength <= 3) return { level: 2, text: 'Média', color: 'text-amber-600' }
  return { level: 3, text: 'Forte', color: 'text-forest-600' }
})

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

  if (password.value.length < 8) {
    passwordError.value = fieldErrors.passwordMinLength
    return false
  }

  passwordError.value = ''
  return true
}

function validateConfirmPassword(): boolean {
  if (!confirmPassword.value) {
    confirmPasswordError.value = fieldErrors.confirmPasswordRequired
    return false
  }

  if (confirmPassword.value !== password.value) {
    confirmPasswordError.value = fieldErrors.passwordMismatch
    return false
  }

  confirmPasswordError.value = ''
  return true
}

async function handleSubmit() {
  // Clear previous errors
  emailError.value = ''
  passwordError.value = ''
  confirmPasswordError.value = ''

  // Validate fields
  const isEmailValid = validateEmail()
  const isPasswordValid = validatePassword()
  const isConfirmPasswordValid = validateConfirmPassword()

  if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
    return
  }

  isSubmitting.value = true

  try {
    const { error } = await signUp(email.value, password.value)

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
          Crie sua conta
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

          <div>
            <FormInput
              v-model="password"
              type="password"
              label="Senha"
              placeholder="••••••••"
              required
              :error="passwordError"
              @blur="validatePassword"
            />

            <!-- Password strength indicator -->
            <div v-if="password.length > 0" class="mt-2 flex items-center gap-2">
              <div class="flex-1 flex gap-1">
                <div
                  class="h-1 flex-1 rounded-full transition-colors"
                  :class="passwordStrength.level >= 1 ? 'bg-sunrise-500' : 'bg-stone-200'"
                />
                <div
                  class="h-1 flex-1 rounded-full transition-colors"
                  :class="passwordStrength.level >= 2 ? 'bg-amber-500' : 'bg-stone-200'"
                />
                <div
                  class="h-1 flex-1 rounded-full transition-colors"
                  :class="passwordStrength.level >= 3 ? 'bg-forest-500' : 'bg-stone-200'"
                />
              </div>
              <span class="text-xs font-medium" :class="passwordStrength.color">
                {{ passwordStrength.text }}
              </span>
            </div>
          </div>

          <FormInput
            v-model="confirmPassword"
            type="password"
            label="Confirmar Senha"
            placeholder="••••••••"
            required
            :error="confirmPasswordError"
            @blur="validateConfirmPassword"
          />
        </div>

        <FormButton
          type="submit"
          variant="primary"
          :loading="isSubmitting"
          class="w-full"
        >
          Criar Conta
        </FormButton>

        <p class="text-center text-sm text-stone-600">
          Já tem uma conta?
          <RouterLink
            to="/login"
            class="font-medium text-forest-600 hover:text-forest-700"
          >
            Entrar
          </RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>
