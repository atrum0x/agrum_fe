import React from "react"
import { format, parseISO } from "date-fns"
import { IconHistory, IconTrash, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { LovSelect, type LovOption } from "@/components/lov-select"
import { collectionPointOptions, estateOptions, workTypeOptions } from "@/lib/lov-options"
import { Textarea } from "@/components/ui/textarea"
import {
    getGetAvailableWorkersQueryKey,
    getSearchAttendanceQueryKey,
} from "@/api/generated/endpoints/attendance-controller/attendance-controller"
import {
    getGetAttendanceHistoryQueryKey,
    useCorrectAttendance,
    useDeleteAttendance,
    useGetAttendanceHistory,
} from "@/api/generated/endpoints/attendance-correction-controller/attendance-correction-controller"
import { useGetAllEstates } from "@/api/generated/endpoints/estate-controller/estate-controller"
import { useGetCollectionPoints } from "@/api/generated/endpoints/collection-point-controller/collection-point-controller"
import { useGetWorkTypes } from "@/api/generated/endpoints/work-type-controller/work-type-controller"
import {
    CorrectAttendanceRequestAttendanceCategory,
    type AttendanceCorrectionDto,
    type AttendanceDto,
    type AttendanceSnapshot,
    type CollectionPointDto,
    type Estate,
    type WorkTypeDto,
} from "@/api/generated/models"

type Category = CorrectAttendanceRequestAttendanceCategory

const MAX_REASON_LENGTH = 300

const categoryLabels: Record<Category, string> = {
    REGULAR: "Regular",
    SEASONAL: "Seasonal",
    LENT: "Lent",
    BORROWED: "Borrowed",
}

const categoryOptions: LovOption<Category>[] = Object.values(CorrectAttendanceRequestAttendanceCategory)
    .map((value) => ({ value, label: categoryLabels[value] }))

const toList =<T,>(response: unknown): T[] => {
    if (Array.isArray(response)) return response as T[]
    if (response && typeof response === "object" && "data" in response) {
        return Array.isArray(response.data) ? response.data as T[] : []
    }
    return []
}

const formatDate = (value?: string) => value ? format(parseISO(value), "dd/MM/yyyy") : "-"
const formatDateTime = (value?: string) => value ? format(parseISO(value), "dd/MM/yyyy HH:mm") : "-"

const snapshotFields: { key: keyof AttendanceSnapshot; label: string }[] = [
    { key: "estateId", label: "Site" },
    { key: "workType", label: "Work Type" },
    { key: "cpCode", label: "Collection Point" },
    { key: "attendanceCategory", label: "Category" },
]

const snapshotValue = (snapshot: AttendanceSnapshot | undefined, key: keyof AttendanceSnapshot) => {
    const value = snapshot?.[key]
    if (key === "attendanceCategory" && value) return categoryLabels[value as Category]
    return value || "-"
}

/** One history row: what changed, or what was deleted. */
const HistoryEntry = ({ correction }: { correction: AttendanceCorrectionDto }) => {
    const isDelete = correction.action === "DELETE"
    const changed = snapshotFields.filter(({ key }) => isDelete
        || correction.oldValues?.[key] !== correction.newValues?.[key])
    return (
        <div className="flex flex-col gap-1 border-b px-3 py-2 text-sm last:border-b-0">
            <div className="flex items-center justify-between gap-2">
                <Badge variant={isDelete ? "destructive" : "outline"}>{isDelete ? "Deleted" : "Corrected"}</Badge>
                <span className="text-xs text-muted-foreground">
                    {correction.correctedBy} · {formatDateTime(correction.correctedAt)}
                </span>
            </div>
            <p className="wrap-break-word">{correction.reason}</p>
            <div className="text-xs text-muted-foreground">
                {changed.map(({ key, label }) => (
                    <p key={key}>
                        {label}: {snapshotValue(correction.oldValues, key)}
                        {!isDelete && <> → <span className="text-foreground">{snapshotValue(correction.newValues, key)}</span></>}
                    </p>
                ))}
            </div>
        </div>
    )
}

/**
 * Correct or delete one attendance (Correct Attendance permission, web only).
 * Worker and date are never correctable; a wrong worker or date is deleted and re-recorded.
 * Mount it only while it should be shown.
 */
export const CorrectAttendanceCard = ({
    attendance,
    onClose,
    onSaved,
}: {
    attendance: AttendanceDto
    onClose: () => void
    onSaved?: (message: string) => void
}) => {
    const queryClient = useQueryClient()
    const attendanceId = attendance.attendanceId ?? ""
    const [estateId, setEstateId] = React.useState(attendance.estateId ?? "")
    const [workType, setWorkType] = React.useState(attendance.workType ?? "")
    const [cpCode, setCpCode] = React.useState(attendance.cpCode ?? "")
    const [category, setCategory] = React.useState<Category | "">(attendance.attendanceCategory ?? "")
    const [reason, setReason] = React.useState("")
    const [showInvalid, setShowInvalid] = React.useState(false)
    const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false)
    const [showHistory, setShowHistory] = React.useState(false)
    const { mutate: correctAttendance, isPending: isSaving } = useCorrectAttendance()
    const { mutate: deleteAttendance, isPending: isDeleting } = useDeleteAttendance()
    const isPending = isSaving || isDeleting

    const { data: estatesResponse } = useGetAllEstates()
    // AT-05: only Active sites, but keep the current one so its name still shows
    const estates = toList<Estate>(estatesResponse)
        .filter((estate) => estate.active || estate.id === attendance.estateId)
    const { data: workTypesResponse } = useGetWorkTypes(estateId, { query: { enabled: Boolean(estateId) } })
    const workTypes = estateId ? toList<WorkTypeDto>(workTypesResponse) : []
    const { data: collectionPointsResponse } = useGetCollectionPoints(estateId, undefined, {
        query: { enabled: Boolean(estateId) },
    })
    const collectionPoints = estateId ? toList<CollectionPointDto>(collectionPointsResponse) : []
    const { data: historyResponse, isLoading: isLoadingHistory } = useGetAttendanceHistory(attendanceId, {
        query: { enabled: showHistory && Boolean(attendanceId) },
    })
    const history = toList<AttendanceCorrectionDto>(historyResponse)

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return
            // Escape inside an open Select closes only the Select
            if (document.activeElement?.closest("[role=listbox]")) return
            if (isConfirmingDelete) setIsConfirmingDelete(false)
            else onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [onClose, isConfirmingDelete])

    const changeEstate = (value: string) => {
        setEstateId(value)
        // Work types and collection points belong to a site, and codes are unique across sites
        if (value !== estateId) {
            setWorkType("")
            setCpCode("")
        }
    }

    const hasChanges = estateId !== attendance.estateId
        || workType !== attendance.workType
        || cpCode !== attendance.cpCode
        || category !== attendance.attendanceCategory
    const trimmedReason = reason.trim()
    // AT-15
    const reasonError = !trimmedReason ? "Please enter the reason for the correction." : null

    const onSuccess = (message: string) => {
        void queryClient.invalidateQueries({ queryKey: getSearchAttendanceQueryKey().slice(0, 1) })
        void queryClient.invalidateQueries({ queryKey: getGetAttendanceHistoryQueryKey(attendanceId) })
        // A deleted worker can be recorded again today
        void queryClient.invalidateQueries({ queryKey: getGetAvailableWorkersQueryKey().slice(0, 1) })
        onSaved?.(message)
        onClose()
    }

    const saveValidationError =
        !estateId ? "Attendance cannot be recorded for an inactive or unassigned site."
            : !workType ? "Please select a Work Type."
                : !cpCode ? "Please select the Collection Point."
                    : !category ? "Please select the Attendance Category."
                        : !hasChanges ? "Nothing was changed."
                            : reasonError
    // Set on Save / Delete, so the message matches the button that was pressed
    const [validationError, setValidationError] = React.useState<string | null>(null)

    const handleSave = (event: React.FormEvent) => {
        event.preventDefault()
        setIsConfirmingDelete(false)
        setShowInvalid(true)
        setValidationError(saveValidationError)
        if (saveValidationError) return
        correctAttendance({
            attendanceId,
            data: {
                estateId,
                workType,
                cpCode,
                attendanceCategory: category as Category,
                reason: trimmedReason,
                // AT-18: the server refuses if someone changed it since this list was loaded
                rowVersion: attendance.rowVersion,
            },
        }, { onSuccess: () => onSuccess(`Attendance corrected for ${attendance.employeeCode}.`) })
    }

    const handleDelete = () => {
        setShowInvalid(true)
        setValidationError(reasonError)
        if (reasonError) return
        if (!isConfirmingDelete) {
            setIsConfirmingDelete(true)
            return
        }
        deleteAttendance({
            attendanceId,
            data: { reason: trimmedReason, rowVersion: attendance.rowVersion },
        }, {
            onSuccess: () => onSuccess(`Attendance deleted for ${attendance.employeeCode}.`),
            onError: () => setIsConfirmingDelete(false),
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <Card className="relative z-10 flex max-h-full w-full max-w-2xl flex-col shadow-xl">
                <form onSubmit={handleSave} className="flex min-h-0 flex-col gap-4">
                    <CardHeader className="border-b">
                        <CardTitle>Correct Attendance</CardTitle>
                        <CardDescription>
                            Worker and date cannot be corrected. If either is wrong, delete this attendance and record it again today.
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
                            <div className="min-w-0">
                                <p className="text-sm text-muted-foreground">Worker</p>
                                <p className="truncate text-sm font-medium">
                                    {attendance.employeeCode} · {attendance.employeeName}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Date</p>
                                <p className="text-sm font-medium">{formatDate(attendance.attendanceDate)}</p>
                            </div>

                            <Field>
                                <FieldLabel htmlFor="correct-attendance-site" className="text-muted-foreground">Working Site *</FieldLabel>
                                <LovSelect
                                    id="correct-attendance-site"
                                    value={estateId}
                                    onValueChange={(value) => value && changeEstate(value)}
                                    options={estateOptions(estates)}
                                    placeholder="Select a site"
                                    invalid={showInvalid && !estateId}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="correct-attendance-work-type" className="text-muted-foreground">Work Type *</FieldLabel>
                                <LovSelect
                                    id="correct-attendance-work-type"
                                    value={workType}
                                    onValueChange={setWorkType}
                                    options={workTypeOptions(workTypes)}
                                    placeholder="Select a work type"
                                    invalid={showInvalid && !workType}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="correct-attendance-cp" className="text-muted-foreground">Collection Point *</FieldLabel>
                                <LovSelect
                                    id="correct-attendance-cp"
                                    value={cpCode}
                                    onValueChange={setCpCode}
                                    options={collectionPointOptions(collectionPoints)}
                                    placeholder="Select a collection point"
                                    invalid={showInvalid && !cpCode}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="correct-attendance-category" className="text-muted-foreground">Attendance Category *</FieldLabel>
                                <LovSelect
                                    id="correct-attendance-category"
                                    value={category}
                                    onValueChange={(value) => value && setCategory(value)}
                                    options={categoryOptions}
                                    placeholder="Select a category"
                                    invalid={showInvalid && !category}
                                />
                            </Field>

                            <Field className="sm:col-span-2">
                                <FieldLabel htmlFor="correct-attendance-reason" className="text-muted-foreground">
                                    Correction Reason *
                                </FieldLabel>
                                <Textarea
                                    id="correct-attendance-reason"
                                    required
                                    maxLength={MAX_REASON_LENGTH}
                                    placeholder="Why is this attendance being corrected or deleted?"
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    aria-invalid={showInvalid && Boolean(reasonError)}
                                    className="bg-background"
                                />
                                <p className="text-right text-xs text-muted-foreground">
                                    {reason.length}/{MAX_REASON_LENGTH}
                                </p>
                            </Field>
                        </div>

                        {showHistory && (
                            <div className="flex flex-col gap-2">
                                <p className="text-sm font-medium">History</p>
                                <div className="max-h-60 overflow-y-auto rounded-lg border bg-background">
                                    {history.map((correction) => (
                                        <HistoryEntry key={correction.id} correction={correction} />
                                    ))}
                                    {!isLoadingHistory && history.length === 0 && (
                                        <p className="p-4 text-center text-sm text-muted-foreground">
                                            This attendance has never been corrected.
                                        </p>
                                    )}
                                    {isLoadingHistory && (
                                        <p className="p-4 text-center text-sm text-muted-foreground">Loading history...</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex-wrap justify-end gap-2 border-t">
                        {isConfirmingDelete ? (
                            <>
                                <p className="mr-auto text-sm font-medium">
                                    Delete the attendance of {attendance.employeeCode} on {formatDate(attendance.attendanceDate)}?
                                </p>
                                <Button type="button" variant="outline" onClick={() => setIsConfirmingDelete(false)}>Back</Button>
                                <Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>
                                    {isDeleting ? "Deleting..." : "Confirm Delete"}
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="mr-auto flex gap-2">
                                    <Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>
                                        <IconTrash />
                                        Delete
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={() => setShowHistory((current) => !current)}>
                                        <IconHistory />
                                        {showHistory ? "Hide History" : "View History"}
                                    </Button>
                                </div>
                                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                                <Button type="submit" disabled={isPending}>
                                    {isSaving ? "Saving..." : "Save"}
                                </Button>
                            </>
                        )}
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
