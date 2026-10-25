import React from "react"
import { PageTitle } from "@/components/page-title"
import { format, isSameDay, parseISO, startOfToday } from "date-fns"
import type { DateRange } from "react-day-picker"
import { IconCalendar, IconEdit, IconPlus } from "@tabler/icons-react"
import { RecordAttendanceCard } from "@/components/record-attendance-card"
import { CorrectAttendanceCard } from "@/components/correct-attendance-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { ButtonGroup } from "@/components/ui/button-group"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LovSelect } from "@/components/lov-select"
import { collectionPointOptions, estateOptions, workTypeOptions } from "@/lib/lov-options"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useGetAllEstates } from "@/api/generated/endpoints/estate-controller/estate-controller"
import { useGetCollectionPoints } from "@/api/generated/endpoints/collection-point-controller/collection-point-controller"
import { useGetWorkTypes } from "@/api/generated/endpoints/work-type-controller/work-type-controller"
import { useGetAllEmployees } from "@/api/generated/endpoints/employee-controller/employee-controller"
import { useFindAll } from "@/api/generated/endpoints/user-controller/user-controller"
import { useSearchAttendance } from "@/api/generated/endpoints/attendance-controller/attendance-controller"
import type {
    AppUserDto,
    AttendanceDto,
    AttendanceDtoAttendanceCategory,
    CollectionPointDto,
    EmployeeDto,
    Estate,
    WorkTypeDto,
} from "@/api/generated/models"
import { SearchAutocomplete, type AutocompleteOption } from "@/components/search-autocomplete"
import { notifySuccess } from "@/lib/notify"

type Filters = {
    employee: string
    estateId: string
    cpCode: string
    workType: string
    recordedBy: string
}

const emptyFilters: Filters = { employee: "", estateId: "", cpCode: "", workType: "", recordedBy: "" }

const categoryLabels: Record<AttendanceDtoAttendanceCategory, string> = {
    REGULAR: "Regular",
    SEASONAL: "Seasonal",
    LENT: "Lent",
    BORROWED: "Borrowed",
}

const toList = <T,>(response: unknown): T[] => {
    if (Array.isArray(response)) return response as T[]
    if (response && typeof response === "object" && "data" in response) {
        return Array.isArray(response.data) ? response.data as T[] : []
    }
    return []
}

// parseISO reads a plain yyyy-MM-dd as a local date, not UTC midnight
const formatDate = (value?: string) => value ? format(parseISO(value), "dd/MM/yyyy") : "-"
const formatDateTime = (value?: string) => value ? format(parseISO(value), "dd/MM/yyyy HH:mm") : "-"
const blankToUndefined = (value: string) => value.trim() || undefined

// Pinned cells need an opaque background so scrolled cells don't show through. This repeats the
// row's hover (muted/50) and selected (muted) colours as opaque mixes, so the whole row highlights
const stickyCell = "bg-background transition-colors "
    + "[tr:not([data-state=selected]):hover>&]:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))] "
    + "[tr[data-state=selected]>&]:bg-muted"

const formatRange = (range: DateRange) => {
    if (!range.from) return ""
    if (!range.to || isSameDay(range.from, range.to)) return format(range.from, "dd/MM/yyyy")
    return `${format(range.from, "dd/MM/yyyy")} – ${format(range.to, "dd/MM/yyyy")}`
}

export const Attendance = () => {

    // Buttons are shown only for granted endpoints; the backend still checks
    const { can } = useAuth()
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const today = React.useMemo(() => startOfToday(), [])
    // Date From / To are mandatory and default to today
    const [range, setRange] = React.useState<DateRange>({ from: today, to: today })
    const [month, setMonth] = React.useState<Date>(today)
    // Edited in the side panel; applied to the list on Search
    const [draftFilters, setDraftFilters] = React.useState<Filters>(emptyFilters)
    const [filters, setFilters] = React.useState<Filters>(emptyFilters)
    const [selectedIds, setSelectedIds] = React.useState<string[]>([])
    const [attendanceForm, setAttendanceForm] = React.useState<"record" | "correct" | null>(null)
    const closeAttendanceForm = React.useCallback(() => setAttendanceForm(null), [])

    const { data: estatesResponse } = useGetAllEstates()
    const estates = React.useMemo(() => toList<Estate>(estatesResponse), [estatesResponse])
    const filterEstateId = draftFilters.estateId
    const { data: collectionPointsResponse } = useGetCollectionPoints(filterEstateId, undefined, {
        query: { enabled: Boolean(filterEstateId) },
    })
    const collectionPoints = React.useMemo(
        () => filterEstateId ? toList<CollectionPointDto>(collectionPointsResponse) : [],
        [filterEstateId, collectionPointsResponse])
    const { data: workTypesResponse } = useGetWorkTypes(filterEstateId, {
        query: { enabled: Boolean(filterEstateId) },
    })
    const workTypes = React.useMemo(
        () => filterEstateId ? toList<WorkTypeDto>(workTypesResponse) : [],
        [filterEstateId, workTypesResponse])

    // Workers from all sites; searched on the server because the employee list can be long
    const workerSearch = React.useDeferredValue(draftFilters.employee.trim())
    const { data: employeesResponse } = useGetAllEmployees({ search: workerSearch || undefined })
    const workerOptions = React.useMemo<AutocompleteOption[]>(
        () => toList<EmployeeDto>(employeesResponse)
            .filter((employee) => employee.employeeCode)
            .map((employee) => ({
                value: employee.employeeCode!,
                description: [employee.firstName, employee.lastName].filter(Boolean).join(" "),
            })),
        [employeesResponse])
    // Recorded By is the username, which is the supervisor's employee code
    const { data: usersResponse } = useFindAll()
    const recorderOptions = React.useMemo<AutocompleteOption[]>(
        () => toList<AppUserDto>(usersResponse)
            .filter((user) => user.username)
            .map((user) => ({ value: user.username! })),
        [usersResponse])

    // The server limits the list to the user's granted sites and sorts it by date, site and EMP No
    const { data: attendanceResponse, isLoading } = useSearchAttendance({
        dateFrom: format(range.from ?? today, "yyyy-MM-dd"),
        // While a range is half picked, show just the first day
        dateTo: format(range.to ?? range.from ?? today, "yyyy-MM-dd"),
        employee: blankToUndefined(filters.employee),
        estateId: blankToUndefined(filters.estateId),
        cpCode: blankToUndefined(filters.cpCode),
        workType: blankToUndefined(filters.workType),
        recordedBy: blankToUndefined(filters.recordedBy),
    })
    const rows = React.useMemo(
        () => toList<AttendanceDto>(attendanceResponse).filter((row) => row.attendanceId),
        [attendanceResponse])

    // Selection can outlive a search; only act on rows that are still listed
    const activeSelection = selectedIds.filter((id) => rows.some((row) => row.attendanceId === id))
    const allSelected = rows.length > 0 && activeSelection.length === rows.length
    const canCorrect = activeSelection.length === 1
    const selectedAttendance = canCorrect
        ? rows.find((row) => row.attendanceId === activeSelection[0])
        : undefined

    const setDraft = (key: keyof Filters, value: string) => setDraftFilters((current) => ({
        ...current,
        [key]: value,
        // Collection points and work types belong to a site
        ...(key === "estateId" && value !== current.estateId ? { cpCode: "", workType: "" } : {}),
    }))

    const selectRange = (next: DateRange) => {
        setRange(next)
        if (next.from) setMonth(next.from)
    }

    const search = () => {
        setFilters(draftFilters)
        setIsSidebarOpen(false)
    }

    const clear = () => {
        setDraftFilters(emptyFilters)
        setFilters(emptyFilters)
        selectRange({ from: today, to: today })
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
                        // Attendance can only be recorded for today, so there is nothing to see later
                        disabled={{ after: today }}
                        // The green fill marks the selection; keep the focus ring for keyboard users only
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
                        <Field>
                            <FieldLabel htmlFor="attendance-filter-employee" className="text-muted-foreground">Worker</FieldLabel>
                            <SearchAutocomplete
                                id="attendance-filter-employee"
                                placeholder="EMP No or name"
                                value={draftFilters.employee}
                                onValueChange={(value) => setDraft("employee", value)}
                                options={workerOptions}
                                filterOnServer
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="attendance-filter-site" className="text-muted-foreground">Working Site</FieldLabel>
                            <LovSelect
                                id="attendance-filter-site"
                                value={draftFilters.estateId}
                                onValueChange={(value) => setDraft("estateId", value)}
                                options={estateOptions(estates)}
                                clearLabel="All sites"
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="attendance-filter-cp" className="text-muted-foreground">Collection Point</FieldLabel>
                            <LovSelect
                                id="attendance-filter-cp"
                                value={draftFilters.cpCode}
                                onValueChange={(value) => setDraft("cpCode", value)}
                                options={collectionPointOptions(collectionPoints)}
                                clearLabel={filterEstateId ? "All collection points" : "Select a site first"}
                                disabled={!filterEstateId}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="attendance-filter-work-type" className="text-muted-foreground">Work Type</FieldLabel>
                            <LovSelect
                                id="attendance-filter-work-type"
                                value={draftFilters.workType}
                                onValueChange={(value) => setDraft("workType", value)}
                                options={workTypeOptions(workTypes)}
                                clearLabel={filterEstateId ? "All work types" : "Select a site first"}
                                disabled={!filterEstateId}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="attendance-filter-recorded-by" className="text-muted-foreground">Recorded By</FieldLabel>
                            <SearchAutocomplete
                                id="attendance-filter-recorded-by"
                                placeholder="Supervisor username"
                                value={draftFilters.recordedBy}
                                onValueChange={(value) => setDraft("recordedBy", value)}
                                options={recorderOptions}
                            />
                        </Field>
                        <div className="flex gap-2">
                            <Button type="submit" className="flex-1">Search</Button>
                            <Button type="button" variant="outline" className="flex-1" onClick={clear}>Clear</Button>
                        </div>
                    </form>
                    <Separator />
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
                        {(can("POST:/api/attendance") || can("POST:/api/attendance/other-site")) && (
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => setAttendanceForm("record")}
                            >
                                <IconPlus />
                                Record Attendance
                            </Button>
                        )}
                        {/* AT-14: administrators only */}
                        {(can("PUT:/api/attendance/{attendanceId}/correction")
                            || can("POST:/api/attendance/{attendanceId}/delete")) && (
                            <Button
                                variant="outline"
                                size="lg"
                                disabled={!canCorrect}
                                onClick={() => setAttendanceForm("correct")}
                            >
                                <IconEdit />
                                Correct Attendance
                            </Button>
                        )}
                    </ButtonGroup>
                    <p className="text-sm text-muted-foreground">
                        {rows.length} {rows.length === 1 ? "record" : "records"} · {formatRange(range)}
                        {activeSelection.length > 1 && " · select one record to correct"}
                    </p>
                </div>

                {attendanceForm === "record" && (
                    <RecordAttendanceCard
                        onClose={closeAttendanceForm}
                        onSaved={(count) => {
                            notifySuccess(`Attendance recorded for ${count} workers.`)
                            // Show today's list, where the new records are
                            selectRange({ from: today, to: today })
                        }}
                    />
                )}

                {attendanceForm === "correct" && selectedAttendance && (
                    <CorrectAttendanceCard
                        // A fresh card for each record
                        key={selectedAttendance.attendanceId}
                        attendance={selectedAttendance}
                        onClose={closeAttendanceForm}
                        onSaved={(message) => {
                            notifySuccess(message)
                            setSelectedIds([])
                        }}
                    />
                )}

                <div className="px-4 pt-2 lg:px-6">
                    <div className="relative overflow-x-auto rounded-lg border bg-background">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted">
                                <TableRow>
                                    {/* Checkbox and EMP No stay fixed while the wide table scrolls */}
                                    <TableHead className="sticky left-0 z-20 w-10 min-w-10 bg-muted">
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={(checked) => setSelectedIds(checked ? rows.map((row) => row.attendanceId!) : [])}
                                            aria-label="Select all attendance"
                                        />
                                    </TableHead>
                                    <TableHead className="sticky left-10 z-20 bg-muted">EMP No</TableHead>
                                    <TableHead>Worker Name</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Working Site</TableHead>
                                    <TableHead>Collection Point</TableHead>
                                    <TableHead>Work Type</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Recorded By / At</TableHead>
                                    <TableHead>Last Corrected By / At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => {
                                    const attendanceId = row.attendanceId!
                                    const isSelected = activeSelection.includes(attendanceId)
                                    return (
                                        <TableRow key={attendanceId} data-state={isSelected ? "selected" : undefined}>
                                            <TableCell className={`sticky left-0 ${stickyCell}`}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => setSelectedIds((current) => checked
                                                        ? [...new Set([...current, attendanceId])]
                                                        : current.filter((id) => id !== attendanceId))}
                                                    aria-label={`Select ${row.employeeCode}`}
                                                />
                                            </TableCell>
                                            <TableCell className={`sticky left-10 font-medium ${stickyCell}`}>{row.employeeCode}</TableCell>
                                            <TableCell className="whitespace-nowrap">{row.employeeName}</TableCell>
                                            <TableCell className="whitespace-nowrap">{formatDate(row.attendanceDate)}</TableCell>
                                            <TableCell className="whitespace-nowrap">{row.estateName || row.estateId}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <p>{row.cpCode}</p>
                                                <p className="text-xs text-muted-foreground">{row.cpName}</p>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{row.workType}</TableCell>
                                            <TableCell>
                                                {row.attendanceCategory && (
                                                    <Badge variant="outline">{categoryLabels[row.attendanceCategory]}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <p>{row.recordedBy}</p>
                                                <p className="text-xs text-muted-foreground">{formatDateTime(row.recordedAt)}</p>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {row.lastCorrectedBy && row.lastCorrectedAt ? (
                                                    <>
                                                        <p>{row.lastCorrectedBy}</p>
                                                        <p className="text-xs text-muted-foreground">{formatDateTime(row.lastCorrectedAt)}</p>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                                            {isLoading ? "Loading attendance..." : `No attendance found for ${formatRange(range)}.`}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </main>
        </div>
    )
}
