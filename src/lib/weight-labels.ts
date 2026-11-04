import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type {
    ApprovalStatus,
    AttendanceCategory,
    ChangeType,
    DayClassification,
    EntryType,
    LineState,
} from "@/lib/weight-format"

/**
 * The weight status names in the chosen language, for the screens that are translated.
 * Screens still only in English keep the labels in weight-format.
 */
export const useWeightLabels = () => {
    const { t } = useTranslation()
    return useMemo(() => ({
        category: {
            REGULAR: t("enums.category.REGULAR"),
            SEASONAL: t("enums.category.SEASONAL"),
            LENT: t("enums.category.LENT"),
            BORROWED: t("enums.category.BORROWED"),
        } satisfies Record<AttendanceCategory, string>,
        entryType: {
            AUTOMATIC: t("enums.entryType.AUTOMATIC"),
            MANUAL: t("enums.entryType.MANUAL"),
        } satisfies Record<EntryType, string>,
        lineState: {
            RECORDED: t("enums.lineState.RECORDED"),
            CANCELLED: t("enums.lineState.CANCELLED"),
        } satisfies Record<LineState, string>,
        approvalStatus: {
            RECORDED: t("enums.approvalStatus.RECORDED"),
            PENDING_AUTHORIZATION: t("enums.approvalStatus.PENDING_AUTHORIZATION"),
            APPROVED: t("enums.approvalStatus.APPROVED"),
            DISAPPROVED: t("enums.approvalStatus.DISAPPROVED"),
        } satisfies Record<ApprovalStatus, string>,
        changeType: {
            CORRECTION: t("enums.changeType.CORRECTION"),
            CANCELLATION: t("enums.changeType.CANCELLATION"),
        } satisfies Record<ChangeType, string>,
        dayClassification: {
            HALF_DAY: t("enums.dayClassification.HALF_DAY"),
            FULL_DAY: t("enums.dayClassification.FULL_DAY"),
        } satisfies Record<DayClassification, string>,
    }), [t])
}

export type WeightLabels = ReturnType<typeof useWeightLabels>
