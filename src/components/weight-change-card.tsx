import React from "react"
import { IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    useRequestWeightCancellation,
    useRequestWeightCorrection,
} from "@/api/generated/endpoints/weight-change-controller/weight-change-controller"
import { getSearchWeightsQueryKey } from "@/api/generated/endpoints/weight-history-controller/weight-history-controller"
import {
    getCountPendingWeightChangesQueryKey,
    getGetPendingWeightChangesQueryKey,
} from "@/api/generated/endpoints/weight-approval-controller/weight-approval-controller"
import type { WeightHistoryRowDto } from "@/api/generated/models"
import {
    afterVariance,
    formatDateTime,
    formatKg,
    formatVariance,
    isValidWeight,
    type ChangeType,
} from "@/lib/weight-format"

const MAX_COMMENT_LENGTH = 300

/**
 * "Correct Weight" / "Request Cancellation" pop-up (FSD 2.8). Nothing on the weighing changes
 * until an approver approves the request. Mount it only while it should be shown.
 */
export const WeightChangeCard = ({
    weighing,
    changeType,
    onClose,
    onSaved,
}: {
    weighing: WeightHistoryRowDto
    changeType: ChangeType
    onClose: () => void
    onSaved?: (message: string) => void
}) => {
    const queryClient = useQueryClient()
    const isCorrection = changeType === "CORRECTION"
    const [correctedWeight, setCorrectedWeight] = React.useState("")
    const [comment, setComment] = React.useState("")
    const [validationError, setValidationError] = React.useState<string | null>(null)
    const [showInvalid, setShowInvalid] = React.useState(false)
    const correction = useRequestWeightCorrection()
    const cancellation = useRequestWeightCancellation()
    const isPending = correction.isPending || cancellation.isPending

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [onClose])

    const currentKg = weighing.weightKg ?? 0
    const variance = weighing.variancePercent ?? 0
    const weightIsValid = isValidWeight(correctedWeight) && Number(correctedWeight) !== currentKg
    const trimmedComment = comment.trim()

    const onSuccess = () => {
        void queryClient.invalidateQueries({ queryKey: getSearchWeightsQueryKey().slice(0, 1) })
        void queryClient.invalidateQueries({ queryKey: getGetPendingWeightChangesQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getCountPendingWeightChangesQueryKey() })
        onSaved?.(isCorrection
            ? `Correction for ${weighing.employeeCode}, weighing ${weighing.entrySequence} submitted for authorization.`
            : `Cancellation of ${weighing.employeeCode}, weighing ${weighing.entrySequence} submitted for authorization.`)
        onClose()
    }

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        correction.reset()
        cancellation.reset()
        setShowInvalid(true)
        const problem =
            isCorrection && !weightIsValid
                ? "Please enter a corrected weight greater than 0 and different from the current weight."
                : !trimmedComment ? "Please enter a comment explaining the change." : null
        setValidationError(problem)
        if (problem) return

        const weightId = weighing.weightId ?? ""
        // WH-10: refused if the weighing changed since this list was loaded
        const rowVersion = weighing.rowVersion
        if (isCorrection) {
            correction.mutate({
                weightId,
                data: { correctedWeightKg: Number(correctedWeight), comment: trimmedComment, rowVersion },
            }, { onSuccess })
        } else {
            cancellation.mutate({ weightId, data: { comment: trimmedComment, rowVersion } }, { onSuccess })
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <Card className="relative z-10 flex max-h-full w-full max-w-lg flex-col shadow-xl">
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
                    <CardHeader className="border-b">
                        <CardTitle>{isCorrection ? "Correct Weight" : "Request Cancellation"}</CardTitle>
                        <CardDescription>
                            {isCorrection
                                ? "The weight stays in use until an approver approves the correction."
                                : "The weighing keeps counting until an approver approves the cancellation."}
                        </CardDescription>
                        <CardAction>
                            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                                <IconX />
                            </Button>
                        </CardAction>
                    </CardHeader>

                    <CardContent className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                        {validationError && (
                            <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
                                {validationError}
                            </div>
                        )}

                        <div className="grid gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
                            <div className="min-w-0 sm:col-span-2">
                                <p className="text-sm text-muted-foreground">Worker</p>
                                <p className="truncate text-sm font-medium">
                                    {weighing.employeeCode} · {weighing.employeeName}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Weighing</p>
                                <p className="text-sm font-medium">
                                    #{weighing.entrySequence} · {formatDateTime(weighing.weighedAt)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Current Weight</p>
                                <p className="text-sm font-medium">
                                    {formatKg(currentKg)} kg
                                    <span className="text-muted-foreground"> → {formatKg(weighing.weightAfterVariance)} kg after {formatVariance(variance)}%</span>
                                </p>
                            </div>

                            {isCorrection && (
                                <>
                                    <Field>
                                        <FieldLabel htmlFor="weight-change-corrected" className="text-muted-foreground">
                                            Corrected Weight (kg) *
                                        </FieldLabel>
                                        <Input
                                            id="weight-change-corrected"
                                            inputMode="decimal"
                                            autoFocus
                                            placeholder="0.00"
                                            value={correctedWeight}
                                            onChange={(event) => setCorrectedWeight(event.target.value)}
                                            aria-invalid={showInvalid && !weightIsValid}
                                            className="bg-background"
                                        />
                                    </Field>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Corrected Weight After Variance</p>
                                        {/* Uses the variance saved on the weighing, not the site's current one */}
                                        <p className="pt-2 text-sm font-medium">
                                            {isValidWeight(correctedWeight)
                                                ? `${formatKg(afterVariance(Number(correctedWeight), variance))} kg`
                                                : "—"}
                                        </p>
                                    </div>
                                </>
                            )}

                            <Field className="sm:col-span-2">
                                <FieldLabel htmlFor="weight-change-comment" className="text-muted-foreground">Comment *</FieldLabel>
                                <Textarea
                                    id="weight-change-comment"
                                    autoFocus={!isCorrection}
                                    maxLength={MAX_COMMENT_LENGTH}
                                    placeholder="Why should this weighing be changed?"
                                    value={comment}
                                    onChange={(event) => setComment(event.target.value)}
                                    aria-invalid={showInvalid && !trimmedComment}
                                    className="bg-background"
                                />
                                <p className="text-right text-sm text-muted-foreground">
                                    {comment.length}/{MAX_COMMENT_LENGTH}
                                </p>
                            </Field>
                        </div>
                    </CardContent>

                    <CardFooter className="justify-end gap-2 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Submitting..." : "Submit for Authorization"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
