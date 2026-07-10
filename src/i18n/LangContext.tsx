import { createContext, useContext, useState, ReactNode } from 'react'
import { translations, Lang } from './translations'

export type { Lang } from './translations'

interface LangContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const LangContext = createContext<LangContextType>({ lang: 'zh', setLang: () => {}, t: (k) => k })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('ppk-lang') as Lang) || 'zh')
  const handleSetLang = (l: Lang) => { setLang(l); localStorage.setItem('ppk-lang', l) }
  const t = (key: string) => translations[lang]?.[key] || translations['zh']?.[key] || key
  return <LangContext.Provider value={{ lang, setLang: handleSetLang, t }}>{children}</LangContext.Provider>
}

export function useLang() { return useContext(LangContext) }
