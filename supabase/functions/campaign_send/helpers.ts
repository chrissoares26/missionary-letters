export interface MissionaryTokenData {
  title: string
  first_name: string
  last_name: string
  mission_name: string | null
}

export function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderTokens(template: string, missionary: MissionaryTokenData): string {
  return template
    .replace(/\{\{title\}\}/g, missionary.title)
    .replace(/\{\{first_name\}\}/g, missionary.first_name)
    .replace(/\{\{last_name\}\}/g, missionary.last_name)
    .replace(/\{\{mission_name\}\}/g, missionary.mission_name ?? '')
    .replace(
      /\{\{full_name\}\}/g,
      `${missionary.title} ${missionary.first_name} ${missionary.last_name}`,
    )
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getRateLimitDelayMs(baseMs = 300, jitterMaxMs = 200): number {
  return baseMs + Math.floor(Math.random() * (jitterMaxMs + 1))
}
