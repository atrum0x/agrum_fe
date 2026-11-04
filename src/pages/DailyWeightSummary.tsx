import React from "react"
import { keepPreviousData } from "@tanstack/react-query"
import { PageTitle } from "@/components/page-title"
import { format, isSameDay, startOfToday, subDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import { useTranslation } from "react-i18next"
import { IconCalendar, IconDownload, IconRefresh } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LovSelect } from "@/components/lov-select"
import { MissingAccessHint } from "@/components/missing-access-hint"
import { SearchAutocomplete, type AutocompleteOption } from "@/components/search-autocomplete"
import { DayClassificationBadge } from "@/components/weight-badges"
import { collectionPointOptions, estateOptions, workTypeOptions } from "@/lib/lov-options"
import { useCalendarFormatters } from "@/i18n/use-calendar-formatters"
import { useWeightLabels } from "@/lib/weight-labels"
import {
    blankToUndefined,
    formatDate,
    formatDateTime,
    formatKg,
    toList,
    unwrap,
} from "@/lib/weight-format"
import { downloadFile } from "@/api/download"
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify"
import { useGetAllEstates } from "@/api/generated/endpoints/estate-controller/estate-controller"
import { useGetCollectionPoints } from "@/api/generated/endpoints/collection-point-controller/collection-point-controller"
import { useGetWorkTypes } from "@/api/generated/endpoints/work-type-controller/work-type-controller"
import { toAutocompleteOptions } from "@/lib/filter-options"
import {
    getSearchDailyWeightSummaryQueryKey,
    useGetSummaryWorkerOptions,
    useRecalculateDailyWeightSummary,
    useSearchDailyWeightSummary,
    useSearchMyDailyWeightSummary,
} from "@/api/generated/endpoints/daily-weight-summary-controller/daily-weight-summary-controller"
import type {
    CollectionPointDto,
    DailyWeightSummaryResultDto,
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
    const { t } = useTranslation()
    const labels = useWeightLabels()
    const calendarFormatters = useCalendarFormatters()
    const queryClient = useQueryClient()
    // Buttons are shown only for granted endpoints; the backend still checks
    const { can } = useAuth()
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const today = React.useMemo(() => startOfToday(), [])
    // DS-01: Date From / To are mandatory; yesterday by default, since today is only final after 10 pm
    const yesterday = React.useMemo(() => subDays(today, 1), [today])
    const [range, setRange] = React.useState<DateRange>({ from: yesterday, to: yesterday })
    const [month, setMonth] = React.useState<Date>(yesterday)
    const [draftFilters, setDraftFilters] = React.useState<Filters>(emptyFilters)
    const [filters, setFilters] = React.useState<Filters>(emptyFilters)
    const [isExporting, setIsExporting] = React.useState(false)
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
    const { data: employeesResponse, isFetching: workersFetching } = useGetSummaryWorkerOptions({ search: workerSearch || undefined }, {
        query: { enabled: !mine && can("GET:/api/daily-weight-summary/filter-options/workers"), placeholderData: keepPreviousData },
    })
    const workersLoading = workersFetching || workerSearch !== draftFilters.employeeCode.trim()
    const workerOptions = React.useMemo<AutocompleteOption[]>(
        () => toAutocompleteOptions(employeesResponse),
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
    const { data: response, isLoading } = mine ? mySearch : allSearch
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
        setIsExporting(true)
        try {
            await downloadFile(mine ? "/api/daily-weight-summary/mine/export" : "/api/daily-weight-summary/export",
                { ...params, employeeCode })
        } catch (error) {
            notifyError(error, t("common.exportFailed"))
        } finally {
            setIsExporting(false)
        }
    }

    const recalculateNow = () => {
        recalculate.mutate(undefined, {
            onSuccess: (dates) => {
                const count = toList<string>(dates).length
                if (count) notifySuccess(t("dailySummary.recalculated", { count }))
                else notifyInfo(t("dailySummary.alreadyRunning"))
                void queryClient.invalidateQueries({ queryKey: getSearchDailyWeightSummaryQueryKey().slice(0, 1) })
            },
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
                        formatters={calendarFormatters}
                        disabled={{ after: today }}
                        className="mx-auto bg-transparent p-0 [--cell-size:--spacing(8)] [&_button:not(:focus-visible)]:ring-0"
                    />
                    <div className="mt-1 flex items-center justify-between gap-2 px-1">
                        <p className="truncate text-sm text-muted-foreground">{formatRange(range)}</p>
                        {!isYesterday && (
                            <Button variant="ghost" size="sm" onClick={() => selectRange({ from: yesterday, to: yesterday })}>
                                {t("common.yesterday")}
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
                        <p className="text-sm font-medium">{t("common.filters")}</p>
                        {!mine && (
                            <Field>
                                <FieldLabel htmlFor="summary-filter-employee" className="text-muted-foreground">{t("fields.workerEmpNo")}</FieldLabel>
                                <SearchAutocomplete
                                    id="summary-filter-employee"
                                    placeholder={t("fields.empNo")}
                                    value={draftFilters.employeeCode}
                                    onValueChange={(value) => setDraft("employeeCode", value)}
                                    options={workerOptions}
                                    loading={workersLoading}
                                />
                                <MissingAccessHint feature={t("common.suggestions")} grant="GET:/api/daily-weight-summary/filter-options/workers" />
                            </Field>
                        )}
                        <Field>
                            <FieldLabel htmlFor="summary-filter-site" className="text-muted-foreground">{t("fields.site")}</FieldLabel>
                            <LovSelect
                                id="summary-filter-site"
                                value={draftFilters.estateId}
                                onValueChange={(value) => setDraft("estateId", value)}
                                options={estateOptions(estates)}
                                clearLabel={t("fields.allSites")}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="summary-filter-cp" className="text-muted-foreground">{t("fields.collectionPoint")}</FieldLabel>
                            <LovSelect
                                id="summary-filter-cp"
                                value={draftFilters.cpCode}
                                onValueChange={(value) => setDraft("cpCode", value)}
                                options={collectionPointOptions(collectionPoints)}
                                clearLabel={t(filterEstateId ? "fields.allCollectionPoints" : "fields.selectSiteFirst")}
                                disabled={!filterEstateId}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="summary-filter-work-type" className="text-muted-foreground">{t("fields.workType")}</FieldLabel>
                            <LovSelect
                                id="summary-filter-work-type"
                                value={draftFilters.workType}
                                onValueChange={(value) => setDraft("workType", value)}
                                options={workTypeOptions(workTypes)}
                                clearLabel={t(filterEstateId ? "fields.allWorkTypes" : "fields.selectSiteFirst")}
                                disabled={!filterEstateId}
                            />
                        </Field>
                        <div className="flex gap-2">
                            <Button type="submit" className="flex-1">{t("common.search")}</Button>
                            <Button type="button" variant="outline" className="flex-1" onClick={clear}>{t("common.clear")}</Button>
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
                        <span>{formatRange(range)} · {t("common.filters")}</span>
                    </Button>
                </div>

                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {t("dailySummary.count", { count: rows.length })} · {formatRange(range)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t("dailySummary.lastUpdatedAt", { time: result?.lastCalculatedAt ? formatDateTime(result.lastCalculatedAt) : t("dailySummary.notCalculated") })}
                            {" "}· {t("dailySummary.schedule")}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {!mine && can("POST:/api/daily-weight-summary/recalculate") && (
                            <Button variant="outline" size="lg" disabled={recalculate.isPending} onClick={recalculateNow}>
                                <IconRefresh />
                                {recalculate.isPending ? t("dailySummary.recalculating") : t("dailySummary.recalculateNow")}
                            </Button>
                        )}
                        {can(mine ? "GET:/api/daily-weight-summary/mine/export" : "GET:/api/daily-weight-summary/export") && (
                            <Button variant="outline" size="lg" disabled={isExporting || rows.length === 0} onClick={exportRows}>
                                <IconDownload />
                                {isExporting ? t("common.exporting") : t("common.export")}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="px-4 pt-2 lg:px-6">
                    <div className="relative overflow-x-auto rounded-lg border bg-background">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted">
                                <TableRow>
                                    <TableHead>{t("dailySummary.date")}</TableHead>
                                    {/* EMP No stays fixed while the wide table scrolls */}
                                    <TableHead className="sticky left-0 z-20 bg-muted">{t("fields.empNo")}</TableHead>
                                    <TableHead>{t("fields.workerName")}</TableHead>
                                    <TableHead>{t("dailySummary.attendanceCategory")}</TableHead>
                                    <TableHead>{t("fields.site")}</TableHead>
                                    <TableHead>{t("fields.collectionPoint")}</TableHead>
                                    <TableHead>{t("fields.workType")}</TableHead>
                                    <TableHead className="text-right">{t("dailySummary.transactions")}</TableHead>
                                    <TableHead className="text-right">{t("dailySummary.dailyTotalKg")}</TableHead>
                                    <TableHead>{t("dailySummary.day")}</TableHead>
                                    <TableHead className="text-right">{t("dailySummary.overweightKg")}</TableHead>
                                    <TableHead>{t("fields.lastUpdated")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={`${row.summaryDate}-${row.employeeCode}`}>
                                        <TableCell className="whitespace-nowrap">{formatDate(row.summaryDate)}</TableCell>
                                        <TableCell className={`sticky left-0 font-medium ${stickyCell}`}>{row.employeeCode}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.employeeName}</TableCell>
                                        <TableCell>
                                            {row.attendanceCategory && <Badge variant="outline">{labels.category[row.attendanceCategory]}</Badge>}
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
                                            {isLoading ? t("dailySummary.loading") : t("dailySummary.empty", { range: formatRange(range) })}
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
