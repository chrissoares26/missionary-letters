import type { AuthError } from '@supabase/supabase-js'

const authErrorMessages: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha inválidos',
  'User already registered': 'Este e-mail já está cadastrado',
  'Email not confirmed': 'Por favor, confirme seu e-mail',
  'Password should be at least 8 characters': 'A senha deve ter pelo menos 8 caracteres',
  'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
  'Failed to fetch': 'Erro de conexão - tente novamente',
  'Network error': 'Erro de conexão - tente novamente',
}

export function getAuthErrorMessage(error: AuthError | null): string {
  if (!error) return 'Erro desconhecido'

  // Check for exact message match
  if (authErrorMessages[error.message]) {
    return authErrorMessages[error.message]
  }

  // Check for partial matches
  const message = error.message.toLowerCase()
  if (message.includes('network') || message.includes('fetch')) {
    return 'Erro de conexão - tente novamente'
  }
  if (message.includes('password')) {
    return 'Erro relacionado à senha'
  }
  if (message.includes('email')) {
    return 'Erro relacionado ao e-mail'
  }

  // Generic fallback
  return 'Erro ao autenticar - tente novamente'
}

// Field validation error messages (pt-BR)
export const fieldErrors = {
  emailRequired: 'E-mail é obrigatório',
  emailInvalid: 'Formato de e-mail inválido',
  passwordRequired: 'Senha é obrigatória',
  passwordMinLength: 'A senha deve ter pelo menos 8 caracteres',
  passwordMismatch: 'As senhas não coincidem',
  confirmPasswordRequired: 'Confirmação de senha é obrigatória',
}
