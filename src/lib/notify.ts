import { toast } from "@/components/ui/toast"
import i18n from "@/i18n"

declare module "@tanstack/react-query" {
    interface Register {
        // errorToast: false when the caller shows the error itself, or the error is expected
        queryMeta: { errorToast?: boolean }
        mutationMeta: { errorToast?: boolean }
    }
}

export const errorMessage = (error: unknown, fallback: string = i18n.t("common.somethingWentWrong")) =>
    error instanceof Error ? error.message : typeof error === "string" ? error : fallback

export const notifySuccess = (title: string) => {
    toast.add({ type: "success", title })
}

export const notifyInfo = (title: string) => {
    toast.add({ type: "info", title })
}

export const notifyError = (error: unknown, fallback?: string) => {
    toast.add({ type: "error", title: errorMessage(error, fallback) })
}
