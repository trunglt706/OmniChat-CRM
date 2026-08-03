'use client'

import { useEffect } from 'react'
import { useCRMStore } from '@/store/crm-store'

const LANG_MAP: Record<string, string> = {
  vi: 'vi',
  en: 'en',
  zh: 'zh',
}

export function HtmlLangSync() {
  const language = useCRMStore((s) => s.settings.language)

  useEffect(() => {
    document.documentElement.lang = LANG_MAP[language] || 'vi'
  }, [language])

  return null
}