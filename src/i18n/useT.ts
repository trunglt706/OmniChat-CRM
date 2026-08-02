import { useCallback, useMemo } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { translations, type Locale } from './translations'

/**
 * useT — lightweight i18n hook for OmniChat CRM
 * Reads language from Zustand store and returns a translation function.
 *
 * Usage:
 *   const t = useT()
 *   <span>{t('convo.title')}</span>
 *   <span>{t('convo.count', { count: 42 })}</span>
 */
export function useT() {
  const language = useCRMStore((s) => s.settings.language) as Locale

  const dict = useMemo(() => translations[language] || translations.vi, [language])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = dict[key] || translations.vi[key] || key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v))
        }
      }
      return text
    },
    [dict]
  )

  return { t, locale: language }
}
