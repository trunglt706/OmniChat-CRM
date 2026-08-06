// ─── Shared Chat / UI Constants ───

export const LOCALE_MAP: Record<string, string> = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN' }

export const GRADIENT_CLASSES = [
  'avatar-gradient-1', 'avatar-gradient-2', 'avatar-gradient-3',
  'avatar-gradient-4', 'avatar-gradient-5', 'avatar-gradient-6',
  'avatar-gradient-7', 'avatar-gradient-8',
]

export const EMOJI_LIST = [
  '😀','😂','🥰','😍','🤩','😎','🤔','😮','😢','😤',
  '👍','👋','🙌','👏','🙏','✅','❤️','🔥','💯','🎉',
  '📧','📎','💼','🛒','💰','⭐','🔔','💬','🤝','👋',
] as const

export const MESSAGES_PER_PAGE = 15

// ─── Date / time formatting helpers ───

export function formatMessageTime(dateStr: string, locale = 'vi') {
  const date = new Date(dateStr)
  return date.toLocaleTimeString(LOCALE_MAP[locale] || 'vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function formatFullDate(dateStr: string, locale = 'vi') {
  const date = new Date(dateStr)
  return date.toLocaleDateString(LOCALE_MAP[locale] || 'vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function shouldShowDate(messages: { createdAt: string }[], idx: number) {
  if (idx === 0) return true
  const prev = new Date(messages[idx - 1].createdAt).toDateString()
  const curr = new Date(messages[idx].createdAt).toDateString()
  return prev !== curr
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
