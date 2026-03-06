import { describe, it, expect } from 'vitest'
import { getAuthErrorMessage, fieldErrors } from '../utils/authErrors'
import type { AuthError } from '@supabase/supabase-js'

function makeError(message: string): AuthError {
  return { message, name: 'AuthApiError', status: 400 } as AuthError
}

describe('getAuthErrorMessage', () => {
  it('maps known Supabase error to pt-BR', () => {
    expect(getAuthErrorMessage(makeError('Invalid login credentials'))).toBe('E-mail ou senha inválidos')
    expect(getAuthErrorMessage(makeError('User already registered'))).toBe('Este e-mail já está cadastrado')
    expect(getAuthErrorMessage(makeError('Email not confirmed'))).toBe('Por favor, confirme seu e-mail')
  })

  it('maps network/fetch errors via partial match', () => {
    expect(getAuthErrorMessage(makeError('Network error occurred'))).toBe('Erro de conexão - tente novamente')
    expect(getAuthErrorMessage(makeError('Failed to fetch'))).toBe('Erro de conexão - tente novamente')
    expect(getAuthErrorMessage(makeError('fetch timeout'))).toBe('Erro de conexão - tente novamente')
  })

  it('maps password/email errors via partial match', () => {
    expect(getAuthErrorMessage(makeError('password too short'))).toBe('Erro relacionado à senha')
    expect(getAuthErrorMessage(makeError('email already in use'))).toBe('Erro relacionado ao e-mail')
  })

  it('returns generic pt-BR fallback for unknown error', () => {
    expect(getAuthErrorMessage(makeError('something unexpected'))).toBe('Erro ao autenticar - tente novamente')
  })

  it('returns unknown error message for null input', () => {
    expect(getAuthErrorMessage(null)).toBe('Erro desconhecido')
  })
})

describe('fieldErrors', () => {
  it('all constants are non-empty strings', () => {
    for (const [, value] of Object.entries(fieldErrors)) {
      expect(typeof value).toBe('string')
      expect(value.length).toBeGreaterThan(0)
    }
  })
})
