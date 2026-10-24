import { Badge } from "@/components/ui/badge"
import {
    approvalStatusLabels,
    dayClassificationLabels,
    type ApprovalStatus,
    type DayClassification,
} from "@/lib/weight-format"

// Amber for pending, red for refused (FSD section 8); everything else stays neutral
const approvalStatusClass: Record<ApprovalStatus, string> = {
    RECORDED: "",
    PENDING_AUTHORIZATION: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    APPROVED: "border-transparent bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    DISAPPROVED: "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20",
}

export const ApprovalStatusBadge = ({ status }: { status?: ApprovalStatus }) => status
    ? <Badge variant="outline" className={approvalStatusClass[status]}>{approvalStatusLabels[status]}</Badge>
    : null

export const DayClassificationBadge = ({ value }: { value?: DayClassification }) => value
    ? <Badge variant={value === "FULL_DAY" ? "default" : "outline"}>{dayClassificationLabels[value]}</Badge>
    : null
