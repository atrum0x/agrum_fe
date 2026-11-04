import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./en.json"
import si from "./si.json"
import ta from "./ta.json"

// Each language is named in its own script, so people can find theirs whatever is showing now
export const languages = [
    { code: "en", label: "English" },
    { code: "si", label: "සිංහල" },
    { code: "ta", label: "தமிழ்" },
] as const

export type LanguageCode = (typeof languages)[number]["code"]

const STORAGE_KEY = "language"

// Storage can be blocked, so fail quietly (see the Customize Columns choice)
const savedLanguage = (): LanguageCode => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        return languages.find((language) => language.code === saved)?.code ?? "en"
    } catch {
        return "en"
    }
}

// Typed as English, so a text missing from another language fails the build
const resources: Record<LanguageCode, { translation: typeof en }> = {
    en: { translation: en },
    si: { translation: si },
    ta: { translation: ta },
}

void i18n.use(initReactI18next).init({
    resources,
    lng: savedLanguage(),
    fallbackLng: "en",
    // React already escapes what it renders
    interpolation: { escapeValue: false },
})

const applyLanguage = (language: string) => {
    // Browsers use this to pick fonts and read the page aloud
    document.documentElement.lang = language
}

applyLanguage(i18n.language)

i18n.on("languageChanged", (language) => {
    applyLanguage(language)
    try {
        localStorage.setItem(STORAGE_KEY, language)
    } catch {
        // not remembered
    }
})

export default i18n
