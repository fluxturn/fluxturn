import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'nodejs' | 'flutter'

interface LanguageContextType {
  selectedLanguage: Language
  setSelectedLanguage: (language: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const LANGUAGE_STORAGE_KEY = 'fluxturn-docs-language'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [selectedLanguage, setSelectedLanguageState] = useState<Language>('nodejs')

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language
    if (savedLanguage && (savedLanguage === 'nodejs' || savedLanguage === 'flutter')) {
      setSelectedLanguageState(savedLanguage)
    }
  }, [])

  // Save language preference to localStorage whenever it changes
  const setSelectedLanguage = (language: Language) => {
    setSelectedLanguageState(language)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }

  return (
    <LanguageContext.Provider value={{ selectedLanguage, setSelectedLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    // Instead of throwing an error, return a default context
    // console.warn('useLanguage is being used outside of LanguageProvider, using default values')
    return {
      selectedLanguage: 'nodejs' as Language,
      setSelectedLanguage: () => {}
    }
  }
  return context
}