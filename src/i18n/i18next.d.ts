import "i18next"
import type en from "./en.json"

// Makes t("...") check its key against the English file when building
declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: "translation"
        resources: { translation: typeof en }
    }
}
