import { describe, expect, it } from 'vitest'
import { escapeHtml, renderTokens, toBase64Url } from '../../supabase/functions/campaign_send/helpers'

describe('campaign_send helpers', () => {
  it('escapes HTML-sensitive characters', () => {
    const input = '<a href="/x?y=1&z=2">"Hello"</a>'
    const result = escapeHtml(input)

    expect(result).toBe('&lt;a href=&quot;/x?y=1&amp;z=2&quot;&gt;&quot;Hello&quot;&lt;/a&gt;')
  })

  it('renders all missionary tokens', () => {
    const template = 'Oi {{title}} {{first_name}} {{last_name}} ({{full_name}}) - {{mission_name}}'
    const result = renderTokens(template, {
      title: 'Elder',
      first_name: 'John',
      last_name: 'Doe',
      mission_name: 'Berlin Mission',
    })

    expect(result).toBe('Oi Elder John Doe (Elder John Doe) - Berlin Mission')
  })

  it('renders empty string for null mission_name', () => {
    const result = renderTokens('Mission: {{mission_name}}', {
      title: 'Sister',
      first_name: 'Jane',
      last_name: 'Smith',
      mission_name: null,
    })

    expect(result).toBe('Mission: ')
  })

  it('encodes base64url without padding', () => {
    const payload = 'Olá +/= test'
    const encoded = toBase64Url(payload)

    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')

    const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4)
    const restored = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
    expect(restored).toBe(payload)
  })
})
