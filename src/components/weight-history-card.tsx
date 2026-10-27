import React from "react"
import { IconX } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ApprovalStatusBadge } from "@/components/weight-badges"
import { useGetWeightHistory } from "@/api/generated/endpoints/weight-history-controller/weight-history-controller"
import type { WeightAuditDto, WeightChangeDto } from "@/api/generated/models"
import {
    changeTypeLabels,
    entryTypeLabels,
    formatDateTime,
    formatKg,
    formatVariance,
    unwrap,
} from "@/lib/weight-format"

const Detail = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{children}</p>
    </div>
)

/** One change request: what was asked, by whom, and the decision. */
const ChangeEntry = ({ change }: { change: WeightChangeDto }) => (
    <div className="flex flex-col gap-1 border-b px-3 py-2 text-sm last:border-b-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                <Badge variant="outline">{change.changeType ? changeTypeLabels[change.changeType] : ""}</Badge>
                <ApprovalStatusBadge status={change.requestStatus} />
            </div>
            <span className="text-sm text-muted-foreground">
                {change.requestedBy} · {formatDateTime(change.requestedAt)}
            </span>
        </div>
        <p className="text-sm text-muted-foreground">
            {change.changeType === "CORRECTION"
                ? <>Weight: {formatKg(change.previousWeightKg)} → <span className="text-foreground">{formatKg(change.proposedWeightKg)} kg</span></>
                : <>Weight at request: {formatKg(change.previousWeightKg)} kg</>}
        </p>
        <p className="wrap-break-word">{change.comment}</p>
        {change.decidedBy && (
            <p className="text-sm text-muted-foreground">
                {change.requestStatus === "APPROVED" ? "Approved" : "Disapproved"} by {change.decidedBy} · {formatDateTime(change.decidedAt)}
            </p>
        )}
    </div>
)

/**
 * View History (FSD 2.8): the weighing as first recorded and every change request on it, newest first.
 * Mount it only while it should be shown.
 */
export const WeightHistoryCard = ({ weightId, onClose }: { weightId: string; onClose: () => void }) => {
    const { data: response, isLoading } = useGetWeightHistory(weightId)
    const audit = unwrap<WeightAuditDto>(response)
    const weighing = audit?.weighing
    const changes = audit?.changes ?? []

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <Card className="relative z-10 flex max-h-full w-full max-w-2xl flex-col shadow-xl">
                <CardHeader className="border-b">
                    <CardTitle>Weight History</CardTitle>
                    <CardDescription>
                        {weighing ? `${weighing.employeeCode} · ${weighing.employeeName} · weighing ${weighing.entrySequence}` : " "}
                    </CardDescription>
                    <CardAction>
                        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                            <IconX />
                        </Button>
                    </CardAction>
                </CardHeader>

                <CardContent className="flex min-h-0 flex-col gap-4 overflow-y-auto pb-4">
                    {isLoading && <p className="p-4 text-center text-sm text-muted-foreground">Loading history...</p>}

                    {weighing && (
                        <div className="grid gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-3">
                            <Detail label="Weighed At">{formatDateTime(weighing.weighedAt)}</Detail>
                            <Detail label="Supervisor">{weighing.supervisor}</Detail>
                            <Detail label="Entry Type">{weighing.entryType ? entryTypeLabels[weighing.entryType] : "—"}</Detail>
                            <Detail label="Original Weight">{formatKg(weighing.originalWeightKg)} kg</Detail>
                            <Detail label="Weight In Use">{formatKg(weighing.weightKg)} kg</Detail>
                            <Detail label="After Variance">
                                {formatKg(weighing.weightAfterVariance)} kg ({formatVariance(weighing.variancePercent)}%)
                            </Detail>
                            <Detail label="Site">{weighing.estateId} · {weighing.cpCode} · {weighing.workType}</Detail>
                            <Detail label="Line State">{weighing.lineState === "CANCELLED" ? "Cancelled" : "Recorded"}</Detail>
                            <Detail label="Received At">{formatDateTime(weighing.receivedAt)}</Detail>
                        </div>
                    )}

                    {weighing && (
                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-medium">Change Requests</p>
                            <div className="rounded-lg border bg-background">
                                {changes.map((change) => <ChangeEntry key={change.changeId} change={change} />)}
                                {changes.length === 0 && (
                                    <p className="p-4 text-center text-sm text-muted-foreground">
                                        This weighing has never been changed.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
