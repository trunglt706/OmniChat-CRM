// ─── OmniChat CRM i18n Translations ───
// Translation files are in ./translations/<locale>.json
// This file re-exports types, locale config, and the merged dictionary.

export type Locale = 'vi' | 'en' | 'zh'

export const LOCALE_LABELS: Record<Locale, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  zh: '中文',
}

export const LOCALES: Locale[] = ['vi', 'en', 'zh']

import vi from './translations/vi.json'
import en from './translations/en.json'
import zh from './translations/zh.json'

/**
 * Full translation dictionary — keyed by locale, then by translation key.
 * Used by useT() hook.
 */
export const translations: Record<Locale, Record<string, string>> = { vi, en, zh }
