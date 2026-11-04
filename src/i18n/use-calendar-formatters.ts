import { useMemo } from "react"
import { useTranslation } from "react-i18next"

// Browsers give Sinhala the traditional names (දුරුතු, ඉල්...); these are the ones used day to day
const SINHALA_MONTHS = ["ජනවාරි", "පෙබරවාරි", "මාර්තු", "අප්‍රේල්", "මැයි", "ජූනි", "ජූලි", "අගෝස්තු", "සැප්තැම්බර්", "ඔක්තෝබර්", "නොවැම්බර්", "දෙසැම්බර්"]

/**
 * Month and weekday names for the Calendar. date-fns has no Sinhala locale, so these come from the browser.
 * English keeps the Calendar's own format.
 */
export const useCalendarFormatters = () => {
    const { i18n } = useTranslation()
    const language = i18n.language
    return useMemo(() => language === "en" ? undefined : {
        formatCaption: (date: Date) => language === "si"
            ? `${SINHALA_MONTHS[date.getMonth()]} ${date.getFullYear()}`
            : date.toLocaleDateString(language, { month: "long", year: "numeric" }),
        // Narrow, because the day cells are small
        formatWeekdayName: (date: Date) => date.toLocaleDateString(language, { weekday: "narrow" }),
    }, [language])
}
