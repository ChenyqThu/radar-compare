import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { zhCN, type Locale } from './zh-CN'
import { enUS } from './en-US'

export type LanguageCode = 'zh-CN' | 'en-US'

const locales: Record<LanguageCode, Locale> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

interface I18nState {
  language: LanguageCode
  setLanguage: (lang: LanguageCode) => void
  t: Locale
}

export const useI18n = create<I18nState>()(
  persist(
    (set) => ({
      language: 'zh-CN',
      setLanguage: (lang) => set({ language: lang, t: locales[lang] }),
      t: zhCN,
    }),
    {
      name: 'radar-i18n',
      partialize: (state) => ({ language: state.language }),
      merge: (persisted, current) => {
        const persistedState = persisted as { language?: LanguageCode }
        const lang = persistedState?.language || 'zh-CN'
        return {
          ...current,
          language: lang,
          t: locales[lang],
        }
      },
    }
  )
)

// Re-export types and locales
export { type Locale } from './zh-CN'
export { zhCN, enUS }
