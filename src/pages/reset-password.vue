<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import FormInput from '@/components/ui/FormInput.vue'
import FormButton from '@/components/ui/FormButton.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { getAuthErrorMessage, fieldErrors } from '@/utils/authErrors'

const router = useRouter()
const route = useRoute()
const { resetPassword, updatePassword, isAuthenticated } = useAuth()
const { error: showToastError, success: showToastSuccess } = useToast()

// Mode detection: if user is authenticated (via reset link), show update mode
const mode = ref<'request' | 'update'>('request')
const email = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const isSubmitting = ref(false)
const requestSent = ref(false)

// Password strength indicator
const passwordStrength = computed(() => {
  const pwd = newPassword.value
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

onMounted(() => {
  // Check if user came from reset email (authenticated via token exchange)
  if (isAuthenticated.value) {
    mode.value = 'update'
  }
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
  if (!newPassword.value) {
    passwordError.value = fieldErrors.passwordRequired
    return false
  }

  if (newPassword.value.length < 8) {
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

  if (confirmPassword.value !== newPassword.value) {
    confirmPasswordError.value = fieldErrors.passwordMismatch
    return false
  }

  confirmPasswordError.value = ''
  return true
}

async function handleRequestReset() {
  emailError.value = ''

  if (!validateEmail()) {
    return
  }

  isSubmitting.value = true

  try {
    const { error } = await resetPassword(email.value)

    if (error) {
      showToastError(getAuthErrorMessage(error))
      return
    }

    requestSent.value = true
  } finally {
    isSubmitting.value = false
  }
}

async function handleUpdatePassword() {
  passwordError.value = ''
  confirmPasswordError.value = ''

  const isPasswordValid = validatePassword()
  const isConfirmPasswordValid = validateConfirmPassword()

  if (!isPasswordValid || !isConfirmPasswordValid) {
    return
  }

  isSubmitting.value = true

  try {
    const { error } = await updatePassword(newPassword.value)

    if (error) {
      showToastError(getAuthErrorMessage(error))
      return
    }

    showToastSuccess('Senha atualizada com sucesso!')
    setTimeout(() => {
      router.push('/login')
    }, 1000)
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
          {{ mode === 'request' ? 'Redefinir Senha' : 'Criar Nova Senha' }}
        </p>
      </div>

      <!-- Mode A: Request Reset -->
      <div
        v-if="mode === 'request'"
        class="mt-8 space-y-6 rounded-xl bg-white p-8 shadow-sm"
      >
        <div v-if="!requestSent" class="space-y-4">
          <p class="text-sm text-stone-600">
            Digite seu e-mail e enviaremos instruções para redefinir sua senha.
          </p>

          <FormInput
            v-model="email"
            type="email"
            label="E-mail"
            placeholder="seu@email.com"
            required
            :error="emailError"
            @blur="validateEmail"
          />

          <FormButton
            variant="primary"
            :loading="isSubmitting"
            class="w-full"
            @click="handleRequestReset"
          >
            Enviar Link de Redefinição
          </FormButton>

          <p class="text-center text-sm text-stone-600">
            Lembrou sua senha?
            <RouterLink
              to="/login"
              class="font-medium text-forest-600 hover:text-forest-700"
            >
              Voltar ao login
            </RouterLink>
          </p>
        </div>

        <!-- Success message -->
        <div v-else class="space-y-4 text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-100">
            <svg class="h-6 w-6 text-forest-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>

          <div class="space-y-2">
            <h2 class="text-lg font-semibold text-ink-900">
              E-mail Enviado!
            </h2>
            <p class="text-sm text-stone-600">
              Verifique seu e-mail para instruções sobre como redefinir sua senha.
            </p>
          </div>

          <FormButton
            variant="secondary"
            class="w-full"
            @click="router.push('/login')"
          >
            Voltar ao Login
          </FormButton>
        </div>
      </div>

      <!-- Mode B: Update Password -->
      <form
        v-else
        class="mt-8 space-y-6 rounded-xl bg-white p-8 shadow-sm"
        @submit.prevent="handleUpdatePassword"
      >
        <div class="space-y-4">
          <div>
            <FormInput
              v-model="newPassword"
              type="password"
              label="Nova Senha"
              placeholder="••••••••"
              required
              :error="passwordError"
              @blur="validatePassword"
            />

            <!-- Password strength indicator -->
            <div v-if="newPassword.length > 0" class="mt-2 flex items-center gap-2">
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
            label="Confirmar Nova Senha"
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
          Atualizar Senha
        </FormButton>
      </form>
    </div>
  </div>
</template>
