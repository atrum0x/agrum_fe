import React from "react"
import { IconCheck, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
    getCountPendingWeightChangesQueryKey,
    getGetPendingWeightChangesQueryKey,
    useApproveWeightChange,
    useDisapproveWeightChange,
} from "@/api/generated/endpoints/weight-approval-controller/weight-approval-controller"
import { getSearchWeightsQueryKey } from "@/api/generated/endpoints/weight-history-controller/weight-history-controller"
import type { WeightChangeDto } from "@/api/generated/models"
import { changeTypeLabels, formatDate, formatDateTime, formatKg, formatVariance } from "@/lib/weight-format"

const Detail = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium wrap-break-word">{children}</p>
    </div>
)

/**
 * Approve / Disapprove one pending change (FSD 4.3–4.6). The requester may approve their own request.
 * Mount it only while it should be shown.
 */
export const WeightDecisionCard = ({
    change,
    onClose,
    onSaved,
}: {
    change: WeightChangeDto
    onClose: () => void
    onSaved?: (message: string) => void
}) => {
    const queryClient = useQueryClient()
    const approve = useApproveWeightChange()
    const disapprove = useDisapproveWeightChange()
    const isPending = approve.isPending || disapprove.isPending
    const error = approve.error ?? disapprove.error
    const isCorrection = change.changeType === "CORRECTION"

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [onClose])

    const decide = (decision: "approve" | "disapprove") => {
        approve.reset()
        disapprove.reset()
        const changeId = change.changeId ?? 0
        // WH-10: refused if the weighing changed since this list was loaded
        const data = { weightRowVersion: change.weightRowVersion }
        const onSuccess = () => {
            void queryClient.invalidateQueries({ queryKey: getGetPendingWeightChangesQueryKey() })
            void queryClient.invalidateQueries({ queryKey: getCountPendingWeightChangesQueryKey() })
            void queryClient.invalidateQueries({ queryKey: getSearchWeightsQueryKey().slice(0, 1) })
            onSaved?.(`${changeTypeLabels[change.changeType ?? "CORRECTION"]} for ${change.employeeCode}, weighing ${change.entrySequence} ${decision === "approve" ? "approved" : "disapproved"}.`)
            onClose()
        }
        if (decision === "approve") approve.mutate({ changeId, data }, { onSuccess })
        else disapprove.mutate({ changeId, data }, { onSuccess })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <Card className="relative z-10 flex max-h-full w-full max-w-lg flex-col shadow-xl">
                <CardHeader className="border-b">
                    <CardTitle>{isCorrection ? "Authorize Correction" : "Authorize Cancellation"}</CardTitle>
                    <CardDescription>
                        {isCorrection
                            ? "Approving replaces the weight in use. The original weight is kept in the history."
                            : "Approving cancels the weighing: it stops counting toward totals and the daily limit."}
                    </CardDescription>
                    <CardAction>
                        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                            <IconX />
                        </Button>
                    </CardAction>
                </CardHeader>

                <CardContent className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                    {error instanceof Error && (
                        <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
                            {error.message}
                        </div>
                    )}
                    <div className="grid gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
                        <Detail label="Worker">{change.employeeCode} · {change.employeeName}</Detail>
                        <Detail label="Weighing">#{change.entrySequence} · {formatDate(change.weighDate)} · {change.estateId}</Detail>
                        <Detail label="Current Weight">{formatKg(change.previousWeightKg)} kg</Detail>
                        {isCorrection ? (
                            <Detail label="Requested Weight">
                                {formatKg(change.proposedWeightKg)} kg
                                <span className="font-normal text-muted-foreground">
                                    {" "}→ {formatKg(change.proposedWeightAfterVariance)} kg after {formatVariance(change.variancePercent)}%
                                </span>
                            </Detail>
                        ) : (
                            <Detail label="Requested">Cancel this weighing</Detail>
                        )}
                        <Detail label="Requested By">{change.requestedBy} · {formatDateTime(change.requestedAt)}</Detail>
                        <div className="sm:col-span-2">
                            <Detail label="Comment">{change.comment}</Detail>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="justify-end gap-2 border-t">
                    <Button type="button" variant="outline" className="mr-auto" onClick={onClose}>Close</Button>
                    <Button type="button" variant="destructive" disabled={isPending} onClick={() => decide("disapprove")}>
                        <IconX />
                        {disapprove.isPending ? "Disapproving..." : "Disapprove"}
                    </Button>
                    <Button type="button" disabled={isPending} onClick={() => decide("approve")}>
                        <IconCheck />
                        {approve.isPending ? "Approving..." : "Approve"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
