import { formatInTimeZone } from 'date-fns-tz'
import { useCRMStore } from '@/store/crm-store'

export function getSystemTimezone() {
  const store = useCRMStore.getState()
  return store.systemSettings?.sys_timezone || 'Asia/Ho_Chi_Minh'
}

export function getSystemTimeFormat() {
  const store = useCRMStore.getState()
  return store.systemSettings?.sys_time_format || 'dd/MM/yyyy HH:mm'
}

export function formatDateTime(date: string | Date | number, formatStr?: string) {
  if (!date) return ''
  const tz = getSystemTimezone()
  const fmt = formatStr || getSystemTimeFormat()
  try {
    return formatInTimeZone(new Date(date), tz, fmt)
  } catch (error) {
    return String(date)
  }
}

export function formatTimeOnly(date: string | Date | number) {
  if (!date) return ''
  const tz = getSystemTimezone()
  const fullFormat = getSystemTimeFormat()
  // Extract time portion from full format (detect 12h vs 24h)
  const timeFormat = fullFormat.includes('a') || fullFormat.includes('A') ? 'hh:mm a' : 'HH:mm'
  try {
    return formatInTimeZone(new Date(date), tz, timeFormat)
  } catch (error) {
    return String(date)
  }
}

export function formatDateOnly(date: string | Date | number) {
  if (!date) return ''
  const tz = getSystemTimezone()
  const fullFormat = getSystemTimeFormat()
  // Extract date portion (usually before space)
  const dateFormat = fullFormat.split(' ')[0] || 'dd/MM/yyyy'
  try {
    return formatInTimeZone(new Date(date), tz, dateFormat)
  } catch (error) {
    return String(date)
  }
}
