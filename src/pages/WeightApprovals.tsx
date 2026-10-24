import React from "react"
import { PageTitle } from "@/components/page-title"
import { IconX } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WeightDecisionCard } from "@/components/weight-decision-card"
import { useGetPendingWeightChanges } from "@/api/generated/endpoints/weight-approval-controller/weight-approval-controller"
import type { WeightChangeDto } from "@/api/generated/models"
import { changeTypeLabels, formatDate, formatDateTime, formatKg, toList } from "@/lib/weight-format"

/**
 * "Authorize Weight Lines": every pending correction / cancellation at the user's sites, oldest first.
 * Click a request to approve or disapprove it.
 */
export const WeightApprovals = () => {
    const { data: response, isLoading, error } = useGetPendingWeightChanges()
    const changes = React.useMemo(() => toList<WeightChangeDto>(response), [response])
    const [openId, setOpenId] = React.useState<number | null>(null)
    const closeDecision = React.useCallback(() => setOpenId(null), [])
    const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
    const open = changes.find((change) => change.changeId === openId)

    return (
        <main className="h-full w-full overflow-y-auto bg-background p-4 lg:p-6">
            <PageTitle />
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
                <p className="text-sm text-muted-foreground">
                    {changes.length} {changes.length === 1 ? "request" : "requests"} waiting for authorization
                </p>
            </div>

            {open && (
                <WeightDecisionCard
                    key={open.changeId}
                    change={open}
                    onClose={closeDecision}
                    onSaved={setSuccessMessage}
                />
            )}

            {successMessage && (
                <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-md bg-green-50 p-3 text-sm font-medium text-green-700 lg:mx-6 dark:bg-green-950 dark:text-green-300">
                    <span>{successMessage}</span>
                    <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={() => setSuccessMessage(null)}>
                        <IconX />
                    </Button>
                </div>
            )}
            {error instanceof Error && (
                <div className="mx-4 mb-2 rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive lg:mx-6">
                    {error.message}
                </div>
            )}

            <div className="px-4 pt-2 lg:px-6">
                <div className="relative overflow-x-auto rounded-lg border bg-background">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                <TableHead>Requested</TableHead>
                                <TableHead>Worker</TableHead>
                                <TableHead>Weighing</TableHead>
                                <TableHead>Change</TableHead>
                                <TableHead className="text-right">Current (kg)</TableHead>
                                <TableHead className="text-right">Requested (kg)</TableHead>
                                <TableHead>Comment</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {changes.map((change) => (
                                <TableRow key={change.changeId} className="cursor-pointer" onClick={() => {
                                    setSuccessMessage(null)
                                    setOpenId(change.changeId ?? null)
                                }}>
                                    <TableCell className="whitespace-nowrap">
                                        <p>{change.requestedBy}</p>
                                        <p className="text-xs text-muted-foreground">{formatDateTime(change.requestedAt)}</p>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <p className="font-medium">{change.employeeCode}</p>
                                        <p className="text-xs text-muted-foreground">{change.employeeName}</p>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <p>#{change.entrySequence} · {formatDate(change.weighDate)}</p>
                                        <p className="text-xs text-muted-foreground">{change.estateId}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={change.changeType === "CANCELLATION" ? "destructive" : "outline"}>
                                            {change.changeType ? changeTypeLabels[change.changeType] : ""}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{formatKg(change.previousWeightKg)}</TableCell>
                                    <TableCell className="text-right font-medium tabular-nums">
                                        {change.changeType === "CORRECTION" ? formatKg(change.proposedWeightKg) : "—"}
                                    </TableCell>
                                    <TableCell className="max-w-72 truncate" title={change.comment}>{change.comment}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm">Review</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {changes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        {isLoading ? "Loading requests..." : "Nothing is waiting for authorization."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </main>
    )
}
