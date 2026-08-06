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

import { formatTimeOnly, formatDateOnly, formatDateTime, getSystemTimezone } from '@/lib/format-time'
import { formatInTimeZone } from 'date-fns-tz'

export function formatMessageTime(dateStr: string, locale = 'vi') {
  return formatTimeOnly(dateStr)
}

export function formatFullDate(dateStr: string, locale = 'vi') {
  const tz = getSystemTimezone()
  try {
    return formatInTimeZone(new Date(dateStr), tz, 'EEEE, dd/MM/yyyy')
  } catch {
    return formatDateOnly(dateStr)
  }
}

export function shouldShowDate(messages: { createdAt: string }[], idx: number) {
  if (idx === 0) return true
  const prev = formatDateOnly(messages[idx - 1].createdAt)
  const curr = formatDateOnly(messages[idx].createdAt)
  return prev !== curr
}

