import React from "react"
import { format, parseISO } from "date-fns"
import { IconSearch, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LovSelect, type LovOption } from "@/components/lov-select"
import { collectionPointOptions, estateOptions, workTypeOptions } from "@/lib/lov-options"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    getGetAvailableWorkersQueryKey,
    getSearchAttendanceQueryKey,
    useGetAttendanceDefaults,
    useGetAvailableWorkers,
    useRecordAttendance,
} from "@/api/generated/endpoints/attendance-controller/attendance-controller"
import { useGetAllEstates } from "@/api/generated/endpoints/estate-controller/estate-controller"
import { useGetCollectionPoints } from "@/api/generated/endpoints/collection-point-controller/collection-point-controller"
import { useGetWorkTypes } from "@/api/generated/endpoints/work-type-controller/work-type-controller"
import {
    AttendanceWorkerRequestAttendanceCategory,
    type AttendanceDefaultsDto,
    type AttendanceWorkerDto,
    type CollectionPointDto,
    type Estate,
    type WorkTypeDto,
} from "@/api/generated/models"

type Category = AttendanceWorkerRequestAttendanceCategory

const categoryLabels: Record<Category, string> = {
    REGULAR: "Regular",
    SEASONAL: "Seasonal",
    LENT: "Lent",
    BORROWED: "Borrowed",
}

const categoryOptions: LovOption<Category>[] = Object.values(AttendanceWorkerRequestAttendanceCategory)
    .map((value) => ({ value, label: categoryLabels[value] }))

type TickedWorker = { worker: AttendanceWorkerDto; category: Category | "" }

const toList = <T,>(response: unknown): T[] => {
    if (Array.isArray(response)) return response as T[]
    if (response && typeof response === "object" && "data" in response) {
        return Array.isArray(response.data) ? response.data as T[] : []
    }
    return []
}

const toValue = <T,>(response: unknown): T | undefined => {
    if (response && typeof response === "object" && "data" in response && "status" in response) {
        return response.data as T
    }
    return response as T | undefined
}

/**
 * Record one batch: one working site, work type and collection point for all ticked workers.
 * Mount it only while it should be shown.
 */
export const RecordAttendanceCard = ({
    onClose,
    onSaved,
}: {
    onClose: () => void
    onSaved?: (count: number) => void
}) => {
    const queryClient = useQueryClient()
    // null = not chosen by the user yet, so the default applies
    const [chosenEstateId, setChosenEstateId] = React.useState<string | null>(null)
    const [workType, setWorkType] = React.useState("")
    const [chosenCpCode, setChosenCpCode] = React.useState<string | null>(null)
    const [search, setSearch] = React.useState("")
    // Keyed by EMP No; kept while the search changes
    const [ticked, setTicked] = React.useState<Map<string, TickedWorker>>(new Map())
    const [showInvalid, setShowInvalid] = React.useState(false)
    const [isConfirming, setIsConfirming] = React.useState(false)
    const { mutate: recordAttendance, isPending } = useRecordAttendance()

    const { data: defaultsResponse } = useGetAttendanceDefaults()
    const defaults = toValue<AttendanceDefaultsDto>(defaultsResponse)
    const { data: estatesResponse } = useGetAllEstates()
    // AT-05: only Active sites can take new attendance
    const estates = React.useMemo(
        () => toList<Estate>(estatesResponse).filter((estate) => estate.active),
        [estatesResponse])

    // Working Site defaults to the supervisor's default site
    const defaultEstateId = estates.some((estate) => estate.id === defaults?.defaultEstateId)
        ? defaults?.defaultEstateId ?? ""
        : ""
    const estateId = chosenEstateId ?? defaultEstateId

    const { data: workTypesResponse, isSuccess: workTypesLoaded } = useGetWorkTypes(estateId, {
        query: { enabled: Boolean(estateId) },
    })
    const workTypes = estateId ? toList<WorkTypeDto>(workTypesResponse) : []
    const { data: collectionPointsResponse, isSuccess: collectionPointsLoaded } = useGetCollectionPoints(estateId, undefined, {
        query: { enabled: Boolean(estateId) },
    })
    const collectionPoints = estateId ? toList<CollectionPointDto>(collectionPointsResponse) : []
    // AT-10
    const isSiteIncomplete = Boolean(estateId) && workTypesLoaded && collectionPointsLoaded
        && (workTypes.length === 0 || collectionPoints.length === 0)

    // Workers from all sites, Active, employed today and not yet marked (D-19); searched on the server
    const workerSearch = React.useDeferredValue(search.trim())
    const { data: workersResponse, isLoading: isLoadingWorkers } =
        useGetAvailableWorkers({ search: workerSearch || undefined })
    const workers = React.useMemo(() => toList<AttendanceWorkerDto>(workersResponse), [workersResponse])

    const tickedWorkers = [...ticked.values()]

    // Collection Point defaults to the ticked workers' personal default when they all share one, else the site default
    const personalCpCodes = new Set(tickedWorkers.map(({ worker }) => worker.defaultCpCode))
    const sharedCpCode = personalCpCodes.size === 1 ? [...personalCpCodes][0] : undefined
    const autoCpCode = sharedCpCode && collectionPoints.some((point) => point.cpCode === sharedCpCode)
        ? sharedCpCode
        : collectionPoints.find((point) => point.isDefault)?.cpCode ?? ""
    const cpCode = chosenCpCode ?? autoCpCode

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return
            // Escape inside an open Select closes only the Select
            if (document.activeElement?.closest("[role=listbox]")) return
            if (isConfirming) setIsConfirming(false)
            else onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [onClose, isConfirming])

    const changeEstate = (value: string) => {
        setChosenEstateId(value)
        // Work types and collection points belong to a site
        setWorkType("")
        setChosenCpCode(null)
        setIsConfirming(false)
    }

    const toggleWorker = (worker: AttendanceWorkerDto, checked: boolean) => {
        const code = worker.employeeCode ?? ""
        setTicked((current) => {
            const next = new Map(current)
            // Category defaults to the worker's employment category; it can be changed before submit
            if (checked) next.set(code, { worker, category: worker.defaultCategory ?? "" })
            else next.delete(code)
            return next
        })
        setIsConfirming(false)
    }

    const setCategory = (code: string, category: Category) => setTicked((current) => {
        const next = new Map(current)
        const entry = next.get(code)
        if (entry) next.set(code, { ...entry, category })
        return next
    })

    const missingCategory = tickedWorkers.some(({ category }) => !category)
    const validationError =
        !estateId ? "Attendance cannot be recorded for an inactive or unassigned site."
            : isSiteIncomplete ? "Site setup is incomplete. Please contact the administrator."
                : !workType ? "Please select a Work Type."
                    : !cpCode ? "Please select the Collection Point."
                        : tickedWorkers.length === 0 ? "Please select at least one worker."
                            : missingCategory ? "Please select the Attendance Category."
                                : null

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        if (validationError) {
            setShowInvalid(true)
            return
        }
        if (!isConfirming) {
            setIsConfirming(true)
            return
        }
        const count = tickedWorkers.length
        recordAttendance({
            data: {
                estateId,
                workType,
                cpCode,
                workers: tickedWorkers.map(({ worker, category }) => ({
                    employeeCode: worker.employeeCode,
                    attendanceCategory: category as Category,
                })),
            },
        }, {
            onSuccess: () => {
                void queryClient.invalidateQueries({ queryKey: getSearchAttendanceQueryKey().slice(0, 1) })
                void queryClient.invalidateQueries({ queryKey: getGetAvailableWorkersQueryKey().slice(0, 1) })
                onSaved?.(count)
                onClose()
            },
            onError: () => setIsConfirming(false),
        })
    }

    const estateName = (id: string) => estates.find((estate) => estate.id === id)?.name ?? id
    const today = defaults?.today ? format(parseISO(defaults.today), "dd/MM/yyyy") : ""

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <Card className="relative z-10 flex max-h-full w-full max-w-5xl flex-col shadow-xl">
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
                    <CardHeader className="border-b">
                        <CardTitle>Record Attendance</CardTitle>
                        <CardDescription>
                            {today ? `Attendance for today, ${today}.` : "Attendance for today."}
                        </CardDescription>
                        <CardAction>
                            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                                <IconX />
                            </Button>
                        </CardAction>
                    </CardHeader>

                    <CardContent className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                        {showInvalid && validationError && (
                            <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
                                {validationError}
                            </div>
                        )}

                        <div className="grid gap-4 rounded-xl bg-muted/50 p-4 md:grid-cols-3">
                            <Field>
                                <FieldLabel htmlFor="record-attendance-site" className="text-muted-foreground">Working Site *</FieldLabel>
                                <LovSelect
                                    id="record-attendance-site"
                                    value={estateId}
                                    onValueChange={(value) => value && changeEstate(value)}
                                    options={estateOptions(estates)}
                                    placeholder="Select a site"
                                    invalid={showInvalid && (!estateId || isSiteIncomplete)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="record-attendance-work-type" className="text-muted-foreground">Work Type *</FieldLabel>
                                <LovSelect
                                    id="record-attendance-work-type"
                                    value={workType}
                                    onValueChange={(value) => {
                                        setWorkType(value)
                                        setIsConfirming(false)
                                    }}
                                    options={workTypeOptions(workTypes)}
                                    placeholder={estateId ? "Select a work type" : "Select a site first"}
                                    disabled={!estateId}
                                    invalid={showInvalid && !workType}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="record-attendance-cp" className="text-muted-foreground">Collection Point *</FieldLabel>
                                <LovSelect
                                    id="record-attendance-cp"
                                    value={cpCode}
                                    onValueChange={(value) => {
                                        setChosenCpCode(value)
                                        setIsConfirming(false)
                                    }}
                                    options={collectionPointOptions(collectionPoints)}
                                    placeholder={estateId ? "Select a collection point" : "Select a site first"}
                                    disabled={!estateId}
                                    invalid={showInvalid && !cpCode}
                                />
                            </Field>
                        </div>

                        <div className="grid min-h-0 gap-4 md:grid-cols-2">
                            {/* Available workers */}
                            <div className="flex min-h-0 flex-col gap-2">
                                <p className="text-sm font-medium">Workers</p>
                                <div className="relative">
                                    <IconSearch className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search by EMP No or name"
                                        aria-label="Search workers"
                                        className="pl-8"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                    />
                                </div>
                                <ScrollArea className="h-72 rounded-lg border bg-background">
                                    {workers.map((worker) => {
                                        const code = worker.employeeCode ?? ""
                                        const isTicked = ticked.has(code)
                                        return (
                                            <label
                                                key={code}
                                                className={`flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 ${isTicked ? "bg-accent" : "hover:bg-muted/50"}`}
                                            >
                                                <Checkbox
                                                    checked={isTicked}
                                                    onCheckedChange={(checked) => toggleWorker(worker, Boolean(checked))}
                                                />
                                                <span className="w-20 shrink-0 font-medium">{code}</span>
                                                <span className="min-w-0 flex-1 truncate">{worker.fullName}</span>
                                                {estateId && worker.defaultEstateId !== estateId && (
                                                    <Badge variant="outline" className="shrink-0">
                                                        {worker.defaultEstateId ? estateName(worker.defaultEstateId) : "No default site"}
                                                    </Badge>
                                                )}
                                            </label>
                                        )
                                    })}
                                    {!isLoadingWorkers && workers.length === 0 && (
                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                            {workerSearch
                                                ? "No workers found. Workers already marked today are hidden."
                                                : "No workers left to mark today."}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>

                            {/* Ticked workers, with a category each */}
                            <div className="flex min-h-0 flex-col gap-2">
                                <p className="text-sm font-medium">Selected ({tickedWorkers.length})</p>
                                <div className="h-78 overflow-y-auto rounded-lg border bg-background">
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-muted">
                                            <TableRow>
                                                <TableHead>EMP No</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead className="w-36">Category *</TableHead>
                                                <TableHead className="w-10" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tickedWorkers.map(({ worker, category }) => {
                                                const code = worker.employeeCode ?? ""
                                                return (
                                                    <TableRow key={code}>
                                                        <TableCell className="font-medium">{code}</TableCell>
                                                        <TableCell className="max-w-40 truncate">{worker.fullName}</TableCell>
                                                        <TableCell>
                                                            <LovSelect
                                                                size="sm"
                                                                aria-label={`Category for ${code}`}
                                                                value={category}
                                                                onValueChange={(value) => value && setCategory(code, value)}
                                                                options={categoryOptions}
                                                                invalid={showInvalid && !category}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                aria-label={`Remove ${code}`}
                                                                onClick={() => toggleWorker(worker, false)}
                                                            >
                                                                <IconX />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                            {tickedWorkers.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                        Tick workers on the left.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex-wrap justify-end gap-2 border-t">
                        {isConfirming ? (
                            <>
                                <p className="mr-auto text-sm font-medium">
                                    Attendance cannot be changed after submission. Submit attendance for {tickedWorkers.length} workers?
                                </p>
                                <Button type="button" variant="outline" onClick={() => setIsConfirming(false)}>Back</Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? "Submitting..." : "Confirm"}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                                <Button type="submit" disabled={isPending}>
                                    Submit {tickedWorkers.length > 0 ? `(${tickedWorkers.length})` : ""}
                                </Button>
                            </>
                        )}
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
