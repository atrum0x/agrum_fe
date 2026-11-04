import { LanguagesIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { languages } from "@/i18n"

/** The language choices inside a dropdown menu, styled like the Appearance choices. */
export function LanguageMenuItems() {
    const { t, i18n } = useTranslation()
    return (
        <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1 text-sm text-muted-foreground">{t("profile.language")}</DropdownMenuLabel>
            {languages.map((language) => (
                <DropdownMenuItem
                    key={language.code}
                    onClick={() => void i18n.changeLanguage(language.code)}
                    className={`cursor-pointer ${i18n.language === language.code ? "bg-muted font-bold" : ""}`}
                >
                    <LanguagesIcon />
                    {language.label}
                </DropdownMenuItem>
            ))}
        </DropdownMenuGroup>
    )
}

/** For the login page, which has no profile menu: people choose their language before signing in. */
export function LanguageSwitcher() {
    const { t, i18n } = useTranslation()
    const current = languages.find((language) => language.code === i18n.language) ?? languages[0]
    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" aria-label={t("profile.language")} />}>
                <LanguagesIcon />
                {current.label}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
                <LanguageMenuItems />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
