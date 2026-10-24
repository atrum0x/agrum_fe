import React from "react"
import { PageTitle } from "@/components/page-title"
import { format, isSameDay, startOfToday, subDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import { IconCalendar, IconDownload, IconRefresh, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LovSelect } from "@/components/lov-select"
import { SearchAutocomplete, type AutocompleteOption } from "@/components/search-autocomplete"
import { DayClassificationBadge } from "@/components/weight-badges"
import { collectionPointOptions, estateOptions, workTypeOptions } from "@/lib/lov-options"
import {
    blankToUndefined,
    categoryLabels,
    formatDate,
    formatDateTime,
    formatKg,
    toList,
    unwrap,
} from "@/lib/weight-format"
import { downloadFile } from "@/api/download"
import { useGetAllEstates } from "@/api/generated/endpoints/estate-controller/estate-controller"
import { useGetCollectionPoints } from "@/api/generated/endpoints/collection-point-controller/collection-point-controller"
import { useGetWorkTypes } from "@/api/generated/endpoints/work-type-controller/work-type-controller"
import { useGetAllEmployees } from "@/api/generated/endpoints/employee-controller/employee-controller"
import {
    getSearchDailyWeightSummaryQueryKey,
    useRecalculateDailyWeightSummary,
    useSearchDailyWeightSummary,
    useSearchMyDailyWeightSummary,
} from "@/api/generated/endpoints/daily-weight-summary-controller/daily-weight-summary-controller"
import type {
    CollectionPointDto,
    DailyWeightSummaryResultDto,
    EmployeeDto,
    Estate,
    WorkTypeDto,
} from "@/api/generated/models"

type Filters = {
    employeeCode: string
    estateId: string
    cpCode: string
    workType: string
}

const emptyFilters: Filters = { employeeCode: "", estateId: "", cpCode: "", workType: "" }

// Pinned cells need an opaque background so scrolled cells don't show through (see Attendance)
const stickyCell = "bg-background transition-colors "
    + "[tr:hover>&]:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))]"

const formatRange = (range: DateRange) => {
    if (!range.from) return ""
    if (!range.to || isSameDay(range.from, range.to)) return format(range.from, "dd/MM/yyyy")
    return `${format(range.from, "dd/MM/yyyy")} – ${format(range.to, "dd/MM/yyyy")}`
}

/**
 * Daily Weight Summary (FSD 2.9): read-only results of the 10 pm run, one row per worker per day.
 * With `mine`, the picker's own rows only (separate endpoints on the server).
 */
export const DailyWeightSummary = ({ mine = false }: { mine?: boolean }) => {
    const queryClient = useQueryClient()
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const today = React.useMemo(() => startOfToday(), [])
    // DS-01: Date From / To are mandatory; yesterday by default, since today is only final after 10 pm
    const yesterday = React.useMemo(() => subDays(today, 1), [today])
    const [range, setRange] = React.useState<DateRange>({ from: yesterday, to: yesterday })
    const [month, setMonth] = React.useState<Date>(yesterday)
    const [draftFilters, setDraftFilters] = React.useState<Filters>(emptyFilters)
    const [filters, setFilters] = React.useState<Filters>(emptyFilters)
    const [message, setMessage] = React.useState<string | null>(null)
    const [isExporting, setIsExporting] = React.useState(false)
    const [actionError, setActionError] = React.useState<string | null>(null)
    const recalculate = useRecalculateDailyWeightSummary()

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

    const params = {
        dateFrom: format(range.from ?? yesterday, "yyyy-MM-dd"),
        dateTo: format(range.to ?? range.from ?? yesterday, "yyyy-MM-dd"),
        estateId: blankToUndefined(filters.estateId),
        cpCode: blankToUndefined(filters.cpCode),
        workType: blankToUndefined(filters.workType),
    }
    const employeeCode = mine ? undefined : blankToUndefined(filters.employeeCode)
    const allSearch = useSearchDailyWeightSummary({ ...params, employeeCode }, { query: { enabled: !mine } })
    const mySearch = useSearchMyDailyWeightSummary(params, { query: { enabled: mine } })
    const { data: response, isLoading, error: listError } = mine ? mySearch : allSearch
    const result = unwrap<DailyWeightSummaryResultDto>(response)
    const rows = result?.rows ?? []

    const setDraft = (key: keyof Filters, value: string) => setDraftFilters((current) => ({
        ...current,
        [key]: value,
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
        selectRange({ from: yesterday, to: yesterday })
    }

    const exportRows = async () => {
        setActionError(null)
        setIsExporting(true)
        try {
            await downloadFile(mine ? "/api/daily-weight-summary/mine/export" : "/api/daily-weight-summary/export",
                { ...params, employeeCode })
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "Export failed.")
        } finally {
            setIsExporting(false)
        }
    }

    const recalculateNow = () => {
        setActionError(null)
        setMessage(null)
        recalculate.mutate(undefined, {
            onSuccess: (dates) => {
                const count = toList<string>(dates).length
                setMessage(count
                    ? `Summary recalculated for ${count} ${count === 1 ? "date" : "dates"}.`
                    : "A recalculation is already running. Try again in a moment.")
                void queryClient.invalidateQueries({ queryKey: getSearchDailyWeightSummaryQueryKey().slice(0, 1) })
            },
            onError: (error) => setActionError(error instanceof Error ? error.message : "Recalculation failed."),
        })
    }

    const isYesterday = range.from && isSameDay(range.from, yesterday) && (!range.to || isSameDay(range.to, yesterday))

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
                        disabled={{ after: today }}
                        className="mx-auto bg-transparent p-0 [--cell-size:--spacing(8)] [&_button:not(:focus-visible)]:ring-0"
                    />
                    <div className="mt-1 flex items-center justify-between gap-2 px-1">
                        <p className="truncate text-xs text-muted-foreground">{formatRange(range)}</p>
                        {!isYesterday && (
                            <Button variant="ghost" size="sm" onClick={() => selectRange({ from: yesterday, to: yesterday })}>
                                Yesterday
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
                                <FieldLabel htmlFor="summary-filter-employee" className="text-muted-foreground">Worker EMP No</FieldLabel>
                                <SearchAutocomplete
                                    id="summary-filter-employee"
                                    placeholder="EMP No"
                                    value={draftFilters.employeeCode}
                                    onValueChange={(value) => setDraft("employeeCode", value)}
                                    options={workerOptions}
                                    filterOnServer
                                />
                            </Field>
                        )}
                        <Field>
                            <FieldLabel htmlFor="summary-filter-site" className="text-muted-foreground">Site</FieldLabel>
                            <LovSelect
                                id="summary-filter-site"
                                value={draftFilters.estateId}
                                onValueChange={(value) => setDraft("estateId", value)}
                                options={estateOptions(estates)}
                                clearLabel="All sites"
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="summary-filter-cp" className="text-muted-foreground">Collection Point</FieldLabel>
                            <LovSelect
                                id="summary-filter-cp"
                                value={draftFilters.cpCode}
                                onValueChange={(value) => setDraft("cpCode", value)}
                                options={collectionPointOptions(collectionPoints)}
                                clearLabel={filterEstateId ? "All collection points" : "Select a site first"}
                                disabled={!filterEstateId}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="summary-filter-work-type" className="text-muted-foreground">Work Type</FieldLabel>
                            <LovSelect
                                id="summary-filter-work-type"
                                value={draftFilters.workType}
                                onValueChange={(value) => setDraft("workType", value)}
                                options={workTypeOptions(workTypes)}
                                clearLabel={filterEstateId ? "All work types" : "Select a site first"}
                                disabled={!filterEstateId}
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
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {rows.length} {rows.length === 1 ? "row" : "rows"} · {formatRange(range)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Last updated: {result?.lastCalculatedAt ? formatDateTime(result.lastCalculatedAt) : "not calculated yet"}
                            {" "}· recalculated every night at 10 pm
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {!mine && (
                            <Button variant="outline" size="lg" disabled={recalculate.isPending} onClick={recalculateNow}>
                                <IconRefresh />
                                {recalculate.isPending ? "Recalculating..." : "Recalculate Now"}
                            </Button>
                        )}
                        <Button variant="outline" size="lg" disabled={isExporting || rows.length === 0} onClick={exportRows}>
                            <IconDownload />
                            {isExporting ? "Exporting..." : "Export"}
                        </Button>
                    </div>
                </div>

                {message && (
                    <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-md bg-green-50 p-3 text-sm font-medium text-green-700 lg:mx-6 dark:bg-green-950 dark:text-green-300">
                        <span>{message}</span>
                        <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={() => setMessage(null)}>
                            <IconX />
                        </Button>
                    </div>
                )}
                {(listError instanceof Error || actionError) && (
                    <div className="mx-4 mb-2 rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive lg:mx-6">
                        {actionError ?? (listError as Error).message}
                    </div>
                )}

                <div className="px-4 pt-2 lg:px-6">
                    <div className="relative overflow-x-auto rounded-lg border bg-background">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted">
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    {/* EMP No stays fixed while the wide table scrolls */}
                                    <TableHead className="sticky left-0 z-20 bg-muted">EMP No</TableHead>
                                    <TableHead>Worker Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Site</TableHead>
                                    <TableHead>Collection Point</TableHead>
                                    <TableHead>Work Type</TableHead>
                                    <TableHead className="text-right">Transactions</TableHead>
                                    <TableHead className="text-right">Daily Total (kg)</TableHead>
                                    <TableHead>Day</TableHead>
                                    <TableHead className="text-right">Overweight (kg)</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={`${row.summaryDate}-${row.employeeCode}`}>
                                        <TableCell className="whitespace-nowrap">{formatDate(row.summaryDate)}</TableCell>
                                        <TableCell className={`sticky left-0 font-medium ${stickyCell}`}>{row.employeeCode}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.employeeName}</TableCell>
                                        <TableCell>
                                            {row.attendanceCategory && <Badge variant="outline">{categoryLabels[row.attendanceCategory]}</Badge>}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{row.estateName || row.estateId}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.cpCode}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.workType}</TableCell>
                                        <TableCell className="text-right tabular-nums">{row.transactionCount}</TableCell>
                                        <TableCell className="text-right font-medium tabular-nums">{formatKg(row.dailyTotalKg)}</TableCell>
                                        <TableCell><DayClassificationBadge value={row.dayClassification} /></TableCell>
                                        <TableCell className="text-right tabular-nums">{formatKg(row.overweightKg)}</TableCell>
                                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.calculatedAt)}</TableCell>
                                    </TableRow>
                                ))}
                                {rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                                            {isLoading ? "Loading summary..." : `No summary rows for ${formatRange(range)}.`}
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
