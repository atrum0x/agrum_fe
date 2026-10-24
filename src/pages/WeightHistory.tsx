import React from "react"
import { PageTitle } from "@/components/page-title"
import { format, isSameDay, startOfToday } from "date-fns"
import type { DateRange } from "react-day-picker"
import {
    IconCalendar,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconDownload,
    IconEdit,
    IconHistory,
    IconLayoutColumns,
    IconTrash,
    IconX,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { ButtonGroup } from "@/components/ui/button-group"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LovSelect } from "@/components/lov-select"
import { SearchAutocomplete, type AutocompleteOption } from "@/components/search-autocomplete"
import { ApprovalStatusBadge } from "@/components/weight-badges"
import { WeightChangeCard } from "@/components/weight-change-card"
import { WeightHistoryCard } from "@/components/weight-history-card"
import { collectionPointOptions, estateOptions, workTypeOptions } from "@/lib/lov-options"
import {
    approvalStatusLabels,
    blankToUndefined,
    categoryLabels,
    changeTypeLabels,
    entryTypeLabels,
    formatDateTime,
    formatKg,
    formatVariance,
    lineStateLabels,
    optionsOf,
    toList,
    unwrap,
    type ApprovalStatus,
    type AttendanceCategory,
    type ChangeType,
    type EntryType,
    type LineState,
} from "@/lib/weight-format"
import { downloadFile } from "@/api/download"
import { useGetAllEstates } from "@/api/generated/endpoints/estate-controller/estate-controller"
import { useGetCollectionPoints } from "@/api/generated/endpoints/collection-point-controller/collection-point-controller"
import { useGetWorkTypes } from "@/api/generated/endpoints/work-type-controller/work-type-controller"
import { useGetAllEmployees } from "@/api/generated/endpoints/employee-controller/employee-controller"
import { useFindAll } from "@/api/generated/endpoints/user-controller/user-controller"
import {
    useSearchMyWeights,
    useSearchWeights,
} from "@/api/generated/endpoints/weight-history-controller/weight-history-controller"
import type {
    AppUserDto,
    CollectionPointDto,
    EmployeeDto,
    Estate,
    PageWeightHistoryRowDto,
    WeightHistoryRowDto,
    WorkTypeDto,
} from "@/api/generated/models"

const PAGE_SIZE = 50

type Filters = {
    employeeCode: string
    supervisor: string
    estateId: string
    cpCode: string
    workType: string
    attendanceCategory: AttendanceCategory | ""
    entryType: EntryType | ""
    lineState: LineState | ""
    approvalStatus: ApprovalStatus | ""
}

const emptyFilters: Filters = {
    employeeCode: "", supervisor: "", estateId: "", cpCode: "", workType: "",
    attendanceCategory: "", entryType: "", lineState: "", approvalStatus: "",
}

// Pinned cells need an opaque background so scrolled cells don't show through (see Attendance)
const stickyCell = "bg-background transition-colors "
    + "[tr:not([data-state=selected]):hover>&]:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))] "
    + "[tr[data-state=selected]>&]:bg-muted"

const formatRange = (range: DateRange) => {
    if (!range.from) return ""
    if (!range.to || isSameDay(range.from, range.to)) return format(range.from, "dd/MM/yyyy")
    return `${format(range.from, "dd/MM/yyyy")} – ${format(range.to, "dd/MM/yyyy")}`
}

const Empty = () => <span className="text-muted-foreground">—</span>

type Column = {
    id: string
    label: string
    className?: string
    cell: (row: WeightHistoryRowDto) => React.ReactNode
}

const isCancelled = (row: WeightHistoryRowDto) => row.lineState === "CANCELLED"

// Every column after the pinned EMP No; each can be hidden with Customize Columns
const columns: Column[] = [
    { id: "employeeName", label: "Worker Name", className: "whitespace-nowrap", cell: (row) => row.employeeName },
    { id: "weighedAt", label: "Date / Time", className: "whitespace-nowrap", cell: (row) => formatDateTime(row.weighedAt) },
    { id: "entrySequence", label: "Seq", className: "text-right", cell: (row) => row.entrySequence },
    {
        id: "attendanceCategory", label: "Category",
        cell: (row) => row.attendanceCategory && <Badge variant="outline">{categoryLabels[row.attendanceCategory]}</Badge>,
    },
    { id: "supervisor", label: "Supervisor", className: "whitespace-nowrap", cell: (row) => row.supervisorName },
    {
        id: "site", label: "Site / Collection Point / Work Type", className: "whitespace-nowrap",
        cell: (row) => (
            <>
                <p>{row.estateName || row.estateId}</p>
                <p className="text-xs text-muted-foreground">{row.cpCode} · {row.workType}</p>
            </>
        ),
    },
    {
        id: "weightKg", label: "Weight (kg)", className: "text-right tabular-nums",
        cell: (row) => <span className={isCancelled(row) ? "line-through" : ""}>{formatKg(row.weightKg)}</span>,
    },
    { id: "variancePercent", label: "Variance %", className: "text-right tabular-nums", cell: (row) => formatVariance(row.variancePercent) },
    {
        id: "weightAfterVariance", label: "After Variance (kg)", className: "text-right font-medium tabular-nums",
        cell: (row) => <span className={isCancelled(row) ? "line-through" : ""}>{formatKg(row.weightAfterVariance)}</span>,
    },
    { id: "entryType", label: "Entry Type", cell: (row) => row.entryType ? entryTypeLabels[row.entryType] : "" },
    {
        id: "lineState", label: "Line State",
        cell: (row) => isCancelled(row) ? <Badge variant="secondary">Cancelled</Badge> : "Recorded",
    },
    { id: "approvalStatus", label: "Approval Status", cell: (row) => <ApprovalStatusBadge status={row.approvalStatus} /> },
    {
        id: "requested", label: "Requested By / At", className: "whitespace-nowrap",
        cell: (row) => row.requestedBy ? (
            <>
                <p>{row.requestedBy}</p>
                <p className="text-xs text-muted-foreground">
                    {row.changeType && changeTypeLabels[row.changeType]} · {formatDateTime(row.requestedAt)}
                </p>
            </>
        ) : <Empty />,
    },
    {
        id: "changeComment", label: "Change Comment", className: "max-w-64 truncate",
        cell: (row) => <span title={row.changeComment}>{row.changeComment || <Empty />}</span>,
    },
    {
        id: "decided", label: "Approved / Disapproved By / At", className: "whitespace-nowrap",
        cell: (row) => row.decidedBy ? (
            <>
                <p>{row.decidedBy}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(row.decidedAt)}</p>
            </>
        ) : <Empty />,
    },
    {
        id: "weightId", label: "Weight Record ID", className: "font-mono text-xs text-muted-foreground",
        cell: (row) => <span title={row.weightId}>{row.weightId?.slice(0, 8)}</span>,
    },
]

// The hidden columns are remembered per browser; storage can be blocked, so fail quietly
const readHiddenColumns = (storageKey: string): string[] => {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]")
        return Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : []
    } catch {
        return []
    }
}

const saveHiddenColumns = (storageKey: string, hidden: string[]) => {
    try {
        localStorage.setItem(storageKey, JSON.stringify(hidden))
    } catch {
        // not remembered
    }
}

/**
 * Weight History Management (FSD 2.8). With `mine`, the picker's "My Weighings": their own rows only,
 * no worker filter and no change buttons. The server enforces both through separate endpoints.
 */
export const WeightHistory = ({ mine = false }: { mine?: boolean }) => {
    // Buttons are shown only for granted endpoints; the backend still checks
    const { can } = useAuth()
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const today = React.useMemo(() => startOfToday(), [])
    // WH-01: Date From / To are mandatory and default to today
    const [range, setRange] = React.useState<DateRange>({ from: today, to: today })
    const [month, setMonth] = React.useState<Date>(today)
    // Edited in the side panel; applied to the list on Search
    const [draftFilters, setDraftFilters] = React.useState<Filters>(emptyFilters)
    const [filters, setFilters] = React.useState<Filters>(emptyFilters)
    const [page, setPage] = React.useState(0)
    const [selectedId, setSelectedId] = React.useState<string | null>(null)
    const [dialog, setDialog] = React.useState<ChangeType | "history" | null>(null)
    const closeDialog = React.useCallback(() => setDialog(null), [])
    const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
    const [isExporting, setIsExporting] = React.useState(false)
    const [exportError, setExportError] = React.useState<string | null>(null)
    const columnsStorageKey = mine ? "agrum.myWeighings.hiddenColumns" : "agrum.weightHistory.hiddenColumns"
    const [hiddenColumns, setHiddenColumns] = React.useState<string[]>(() => readHiddenColumns(columnsStorageKey))
    const visibleColumns = columns.filter((column) => !hiddenColumns.includes(column.id))
    const toggleColumn = (id: string, visible: boolean) => setHiddenColumns((current) => {
        const next = visible ? current.filter((hidden) => hidden !== id) : [...current, id]
        saveHiddenColumns(columnsStorageKey, next)
        return next
    })

    const { data: estatesResponse } = useGetAllEstates()
    const estates = React.useMemo(() => toList<Estate>(estatesResponse), [estatesResponse])
    const filterEstateId = draftFilters.estateId
    const { data: collectionPointsResponse } = useGetCollectionPoints(filterEstateId, undefined, {
        query: { enabled: Boolean(filterEstateId) },
    })
    const collectionPoints = filterEstateId ? toList<CollectionPointDto>(collectionPointsResponse) : []
    const { data: workTypesResponse } = useGetWorkTypes(filterEstateId, {
        query: { enabled: Boolean(filterEstateId) },
    })
    const workTypes = filterEstateId ? toList<WorkTypeDto>(workTypesResponse) : []

    // Workers from all sites; searched on the server because the employee list can be long
    const workerSearch = React.useDeferredValue(draftFilters.employeeCode.trim())
    const { data: employeesResponse } = useGetAllEmployees({ search: workerSearch || undefined }, {
        query: { enabled: !mine },
    })
    const workerOptions = React.useMemo<AutocompleteOption[]>(
        () => toList<EmployeeDto>(employeesResponse)
            .filter((employee) => employee.employeeCode)
            .map((employee) => ({
                value: employee.employeeCode!,
                description: [employee.firstName, employee.lastName].filter(Boolean).join(" "),
            })),
        [employeesResponse])
    const { data: usersResponse } = useFindAll({ query: { enabled: !mine } })
    const supervisorOptions = React.useMemo<AutocompleteOption[]>(
        () => toList<AppUserDto>(usersResponse)
            .filter((user) => user.username)
            .map((user) => ({ value: user.username! })),
        [usersResponse])

    const dateParams = {
        dateFrom: format(range.from ?? today, "yyyy-MM-dd"),
        // While a range is half picked, show just the first day
        dateTo: format(range.to ?? range.from ?? today, "yyyy-MM-dd"),
    }
    const filterParams = {
        supervisor: blankToUndefined(filters.supervisor),
        estateId: blankToUndefined(filters.estateId),
        cpCode: blankToUndefined(filters.cpCode),
        workType: blankToUndefined(filters.workType),
        attendanceCategory: filters.attendanceCategory || undefined,
        entryType: filters.entryType || undefined,
        lineState: filters.lineState || undefined,
        approvalStatus: filters.approvalStatus || undefined,
    }
    const pageable = { page, size: PAGE_SIZE }
    const allSearch = useSearchWeights(
        { ...dateParams, ...filterParams, employeeCode: blankToUndefined(filters.employeeCode), pageable },
        { query: { enabled: !mine } })
    const mySearch = useSearchMyWeights({ ...dateParams, ...filterParams, pageable }, { query: { enabled: mine } })
    const { data: searchResponse, isLoading, error: listError } = mine ? mySearch : allSearch
    const result = unwrap<PageWeightHistoryRowDto>(searchResponse)
    const rows = React.useMemo(
        () => (result?.content ?? []).filter((row: WeightHistoryRowDto) => row.weightId),
        [result])
    const totalRows = result?.totalElements ?? 0
    const totalPages = result?.totalPages ?? 0

    // Selection can outlive a search; only act on a row that is still listed
    const selected = rows.find((row) => row.weightId === selectedId)
    // WH-04 / WH-05: no change on a cancelled weighing or while a change is pending
    const changeBlockedReason = !selected ? null
        : selected.lineState === "CANCELLED" ? "This weight record has been cancelled and cannot be changed."
            : selected.approvalStatus === "PENDING_AUTHORIZATION" ? "A change for this record is already pending authorization."
                : null
    const canChange = Boolean(selected) && !changeBlockedReason

    const setDraft = <K extends keyof Filters>(key: K, value: Filters[K]) => setDraftFilters((current) => ({
        ...current,
        [key]: value,
        // Collection points and work types belong to a site
        ...(key === "estateId" && value !== current.estateId ? { cpCode: "", workType: "" } : {}),
    }))

    const selectRange = (next: DateRange) => {
        setRange(next)
        setPage(0)
        if (next.from) setMonth(next.from)
    }

    const search = () => {
        setFilters(draftFilters)
        setPage(0)
        setIsSidebarOpen(false)
    }

    const clear = () => {
        setDraftFilters(emptyFilters)
        setFilters(emptyFilters)
        selectRange({ from: today, to: today })
    }

    const openDialog = (next: ChangeType | "history") => {
        setSuccessMessage(null)
        setDialog(next)
    }

    const exportRows = async () => {
        setExportError(null)
        setIsExporting(true)
        try {
            await downloadFile(mine ? "/api/weights/mine/export" : "/api/weights/export", {
                ...dateParams,
                ...filterParams,
                employeeCode: mine ? undefined : blankToUndefined(filters.employeeCode),
            })
        } catch (error) {
            setExportError(error instanceof Error ? error.message : "Export failed.")
        } finally {
            setIsExporting(false)
        }
    }

    const isToday = range.from && isSameDay(range.from, today) && (!range.to || isSameDay(range.to, today))

    return (
        <div className="flex h-full w-full overflow-hidden">
            {isSidebarOpen && (
                <div
                    className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside className={`
                            absolute inset-y-0 left-0 z-30 flex h-full w-64 shrink-0 flex-col border-r bg-background
                            transition-transform duration-300 ease-in-out
                            lg:static lg:translate-x-0
                            ${isSidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"}
                        `}>
                <div className="border-b p-2">
                    <Calendar
                        mode="range"
                        required
                        selected={range}
                        onSelect={selectRange}
                        month={month}
                        onMonthChange={setMonth}
                        // Weighings are recorded for today only, so there is nothing to see later
                        disabled={{ after: today }}
                        className="mx-auto bg-transparent p-0 [--cell-size:--spacing(8)] [&_button:not(:focus-visible)]:ring-0"
                    />
                    <div className="mt-1 flex items-center justify-between gap-2 px-1">
                        <p className="truncate text-xs text-muted-foreground">{formatRange(range)}</p>
                        {!isToday && (
                            <Button variant="ghost" size="sm" onClick={() => selectRange({ from: today, to: today })}>
                                Today
                            </Button>
                        )}
                    </div>
                </div>

                <ScrollArea className="flex-1 overflow-y-auto">
                    <form
                        className="flex flex-col gap-4 p-4"
                        onSubmit={(event) => {
                            event.preventDefault()
                            search()
                        }}
                    >
                        <p className="text-sm font-medium">Filters</p>
                        {!mine && (
                            <Field>
                                <FieldLabel htmlFor="weight-filter-employee" className="text-muted-foreground">Worker EMP No</FieldLabel>
                                <SearchAutocomplete
                                    id="weight-filter-employee"
                                    placeholder="EMP No"
                                    value={draftFilters.employeeCode}
                                    onValueChange={(value) => setDraft("employeeCode", value)}
                                    options={workerOptions}
                                    filterOnServer
                                />
                            </Field>
                        )}
                        <Field>
                            <FieldLabel htmlFor="weight-filter-supervisor" className="text-muted-foreground">Supervisor</FieldLabel>
                            <SearchAutocomplete
                                id="weight-filter-supervisor"
                                placeholder="Supervisor username"
                                value={draftFilters.supervisor}
                                onValueChange={(value) => setDraft("supervisor", value)}
                                options={supervisorOptions}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="weight-filter-site" className="text-muted-foreground">Site</FieldLabel>
                            <LovSelect
                                id="weight-filter-site"
                                value={draftFilters.estateId}
                                onValueChange={(value) => setDraft("estateId", value)}
                                options={estateOptions(estates)}
                                clearLabel="All sites"
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="weight-filter-cp" className="text-muted-foreground">Collection Point</FieldLabel>
                            <LovSelect
                                id="weight-filter-cp"
                                value={draftFilters.cpCode}
                                onValueChange={(value) => setDraft("cpCode", value)}
                                options={collectionPointOptions(collectionPoints)}
                                clearLabel={filterEstateId ? "All collection points" : "Select a site first"}
                                disabled={!filterEstateId}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="weight-filter-work-type" className="text-muted-foreground">Work Type</FieldLabel>
                            <LovSelect
                                id="weight-filter-work-type"
                                value={draftFilters.workType}
                                onValueChange={(value) => setDraft("workType", value)}
                                options={workTypeOptions(workTypes)}
                                clearLabel={filterEstateId ? "All work types" : "Select a site first"}
                                disabled={!filterEstateId}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="weight-filter-category" className="text-muted-foreground">Employment Category</FieldLabel>
                            <LovSelect
                                id="weight-filter-category"
                                value={draftFilters.attendanceCategory}
                                onValueChange={(value) => setDraft("attendanceCategory", value)}
                                options={optionsOf(categoryLabels)}
                                clearLabel="All categories"
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="weight-filter-entry-type" className="text-muted-foreground">Entry Type</FieldLabel>
                            <LovSelect
                                id="weight-filter-entry-type"
                                value={draftFilters.entryType}
                                onValueChange={(value) => setDraft("entryType", value)}
                                options={optionsOf(entryTypeLabels)}
                                clearLabel="All entry types"
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="weight-filter-line-state" className="text-muted-foreground">Line State</FieldLabel>
                            <LovSelect
                                id="weight-filter-line-state"
                                value={draftFilters.lineState}
                                onValueChange={(value) => setDraft("lineState", value)}
                                options={optionsOf(lineStateLabels)}
                                clearLabel="All line states"
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="weight-filter-approval" className="text-muted-foreground">Approval Status</FieldLabel>
                            <LovSelect
                                id="weight-filter-approval"
                                value={draftFilters.approvalStatus}
                                onValueChange={(value) => setDraft("approvalStatus", value)}
                                options={optionsOf(approvalStatusLabels)}
                                clearLabel="All statuses"
                            />
                        </Field>
                        <div className="flex gap-2">
                            <Button type="submit" className="flex-1">Search</Button>
                            <Button type="button" variant="outline" className="flex-1" onClick={clear}>Clear</Button>
                        </div>
                    </form>
                </ScrollArea>
            </aside>

            <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
                <PageTitle />
                {/* MOBILE TOGGLE BUTTON (Hidden on Desktop) */}
                <div className="mb-6 flex lg:hidden">
                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-start gap-2 text-muted-foreground"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <IconCalendar className="h-4 w-4" />
                        <span>{formatRange(range)} · Filters</span>
                    </Button>
                </div>

                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
                    <ButtonGroup>
                        {/* WH-03 */}
                        {!mine && can("POST:/api/weights/{weightId}/correction") && (
                            <Button variant="outline" size="lg" disabled={!canChange} onClick={() => openDialog("CORRECTION")}>
                                <IconEdit />
                                Correct Weight
                            </Button>
                        )}
                        {!mine && can("POST:/api/weights/{weightId}/cancellation") && (
                            <Button variant="outline" size="lg" disabled={!canChange} onClick={() => openDialog("CANCELLATION")}>
                                <IconTrash />
                                Request Cancellation
                            </Button>
                        )}
                        {can("GET:/api/weights/{weightId}/history") && (
                            <Button variant="outline" size="lg" disabled={!selected} onClick={() => openDialog("history")}>
                                <IconHistory />
                                View History
                            </Button>
                        )}
                    </ButtonGroup>
                    <div className="flex items-center gap-3">
                        <p className="text-sm text-muted-foreground">
                            {totalRows} {totalRows === 1 ? "weighing" : "weighings"} · {formatRange(range)}
                            {changeBlockedReason && !mine && ` · ${changeBlockedReason}`}
                        </p>
                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
                                <IconLayoutColumns />
                                <span className="hidden lg:inline">Customize Columns</span>
                                <span className="lg:hidden">Columns</span>
                                <IconChevronDown />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                {columns.map((column) => (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        checked={!hiddenColumns.includes(column.id)}
                                        onCheckedChange={(value) => toggleColumn(column.id, Boolean(value))}
                                    >
                                        {column.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {can(mine ? "GET:/api/weights/mine/export" : "GET:/api/weights/export") && (
                            <Button variant="outline" size="lg" disabled={isExporting || totalRows === 0} onClick={exportRows}>
                                <IconDownload />
                                {isExporting ? "Exporting..." : "Export"}
                            </Button>
                        )}
                    </div>
                </div>

                {dialog === "history" && selected && (
                    <WeightHistoryCard key={selected.weightId} weightId={selected.weightId!} onClose={closeDialog} />
                )}
                {(dialog === "CORRECTION" || dialog === "CANCELLATION") && selected && (
                    <WeightChangeCard
                        // A fresh card for each record
                        key={`${dialog}-${selected.weightId}`}
                        weighing={selected}
                        changeType={dialog}
                        onClose={closeDialog}
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
                {(listError instanceof Error || exportError) && (
                    <div className="mx-4 mb-2 rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive lg:mx-6">
                        {exportError ?? (listError as Error).message}
                    </div>
                )}

                <div className="px-4 pt-2 lg:px-6">
                    <div className="relative overflow-x-auto rounded-lg border bg-background">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted">
                                <TableRow>
                                    {/* EMP No stays fixed while the wide table scrolls */}
                                    {/* Checkbox and EMP No stay fixed while the wide table scrolls; one row at a time */}
                                    <TableHead className="sticky left-0 z-20 w-10 min-w-10 bg-muted">
                                        <span className="sr-only">Select</span>
                                    </TableHead>
                                    <TableHead className="sticky left-10 z-20 bg-muted">EMP No</TableHead>
                                    {visibleColumns.map((column) => (
                                        <TableHead key={column.id} className={column.className?.includes("text-right") ? "text-right" : undefined}>
                                            {column.label}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => {
                                    const weightId = row.weightId!
                                    const isSelected = weightId === selectedId
                                    return (
                                        <TableRow
                                            key={weightId}
                                            data-state={isSelected ? "selected" : undefined}
                                            // Cancelled weighings stay listed, greyed (TC-70)
                                            className={`cursor-pointer ${isCancelled(row) ? "text-muted-foreground" : ""}`}
                                            onClick={() => setSelectedId(isSelected ? null : weightId)}
                                        >
                                            <TableCell className={`sticky left-0 ${stickyCell}`} onClick={(event) => event.stopPropagation()}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => setSelectedId(checked ? weightId : null)}
                                                    aria-label={`Select ${row.employeeCode} weighing ${row.entrySequence}`}
                                                />
                                            </TableCell>
                                            <TableCell className={`sticky left-10 font-medium ${stickyCell}`}>{row.employeeCode}</TableCell>
                                            {visibleColumns.map((column) => (
                                                <TableCell key={column.id} className={column.className}>{column.cell(row)}</TableCell>
                                            ))}
                                        </TableRow>
                                    )
                                })}
                                {rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={visibleColumns.length + 2} className="h-24 text-center text-muted-foreground">
                                            {isLoading ? "Loading weighings..." : `No weighings found for ${formatRange(range)}.`}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-end gap-2 pt-3">
                            <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</p>
                            <Button variant="outline" size="icon-sm" aria-label="Previous page"
                                    disabled={page === 0} onClick={() => setPage((current) => current - 1)}>
                                <IconChevronLeft />
                            </Button>
                            <Button variant="outline" size="icon-sm" aria-label="Next page"
                                    disabled={page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)}>
                                <IconChevronRight />
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
