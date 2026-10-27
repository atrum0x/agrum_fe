import { Separator } from "@/components/ui/separator"
import { formatKg, formatVariance } from "@/lib/weight-format";
import { PageTitle } from "@/components/page-title"
import { Input } from "@/components/ui/input"
import {
    IconSearch,
} from "@tabler/icons-react"
import React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Estate } from "@/api/generated/models"
import { useGetAllEstates } from "@/api/generated/endpoints/estate-controller/estate-controller"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { ButtonGroup } from "@/components/ui/button-group"
import { EstateFormCard } from "@/components/estate-form-card"
import { CollectionPointsTable } from "@/components/collection-points-table"
import { WorkTypesTable } from "@/components/work-types-table"
import { GrantedUsersTable } from "@/components/granted-users-table"

const TruncatedCell = ({ value, className = "max-w-xs" }: { value: string; className?: string }) => (
    <Tooltip>
        <TooltipTrigger render={<div className={`${className} truncate`} />}>{value || "-"}</TooltipTrigger>
        <TooltipContent className="max-w-[min(32rem,calc(100vw-2rem))] whitespace-normal wrap-break-word">
            {value || "-"}
        </TooltipContent>
    </Tooltip>
)

export const Estates = () => {

    // Buttons are shown only for granted endpoints; the backend still checks
    const { can } = useAuth()
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [estateForm, setEstateForm] = React.useState<"new" | "edit" | null>(null)
    const closeEstateForm = React.useCallback(() => setEstateForm(null), [])
    const { data: estatesResponse } = useGetAllEstates()
    const allEstates = React.useMemo<Estate[]>(() => {
        const response = estatesResponse as unknown
        if (Array.isArray(response)) return response as Estate[]
        if (response && typeof response === "object" && "data" in response) {
            return Array.isArray(response.data) ? response.data as Estate[] : []
        }
        return []
    }, [estatesResponse])
    // GET /api/estates has no search parameter, so filter on the client
    const estates = React.useMemo(() => {
        const term = searchTerm.trim().toLowerCase()
        if (!term) return allEstates
        return allEstates.filter((item) =>
            [item.id, item.name, item.address].some((value) => value?.toLowerCase().includes(term))
        )
    }, [allEstates, searchTerm])
    const activeSelectedItemId = estates.some(
        (item) => item.id === selectedItemId
    )
        ? selectedItemId
        : estates[0]?.id ?? null

    const selectedEstate = estates.find(
        (item) => item.id === activeSelectedItemId
    )

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
                <div className="p-4 border-b">
                    <div className="relative">
                        <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search Sites"
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 overflow-y-auto">
                    {estates.map((item) => {
                        const isSelected = activeSelectedItemId === item.id
                        return (
                            <React.Fragment key={item.id}>
                                <div className={`w-full text-left px-3 py-2 text-sm ${isSelected
                                    ? "bg-accent text-accent-foreground font-medium"
                                    : "hover:bg-muted/50 text-muted-foreground"
                                    }`}
                                    onClick={() => {
                                        setSelectedItemId(item.id ?? null)
                                        setIsSidebarOpen(false)
                                    }}>
                                    <p className="truncate">
                                        {item.name || item.id}
                                    </p>
                                    <p className={` truncate pt-1 text-sm text-muted-foreground ${isSelected ? "font-medium" : ""}`}>
                                        {item.id}
                                    </p>
                                </div>
                                <Separator />
                            </React.Fragment>
                        )
                    })}
                    {estates.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No sites found.
                        </div>
                    )}
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
                        <IconSearch className="h-4 w-4" />
                        <span>Browse Sites...</span>
                    </Button>
                </div>

                <ButtonGroup className="px-4 lg:px-6 mb-2">
                    {can("PUT:/api/estates/{estateId}") && (
                        <Button variant="outline" size="lg" disabled={!selectedEstate} onClick={() => setEstateForm("edit")}>
                            Edit
                        </Button>
                    )}
                    {can("POST:/api/estates") && (
                        <Button variant="outline" size="lg" onClick={() => setEstateForm("new")}>
                            New Site
                        </Button>
                    )}
                </ButtonGroup>
                {estateForm && (
                    <EstateFormCard
                        estate={estateForm === "edit" ? selectedEstate : undefined}
                        onClose={closeEstateForm}
                        onSaved={(estateId) => {
                            // Clear the search so the saved site is in the list and gets selected
                            setSearchTerm("")
                            setSelectedItemId(estateId)
                        }}
                    />
                )}

                <div className="flex flex-col gap-6 pt-0 px-4 lg:px-6 shrink-0">
                    <div className="grid auto-rows-min gap-4 sm:grid-cols-2 md:grid-cols-4 rounded-xl bg-muted/50 p-4 ">
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Site Code</p>
                            <TruncatedCell value={selectedEstate?.id ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Site Name</p>
                            <TruncatedCell value={selectedEstate?.name ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Address</p>
                            <TruncatedCell value={selectedEstate?.address ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Site Status</p>
                            <Badge className={selectedEstate?.active
                                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}>
                                {selectedEstate ? (selectedEstate.active ? "Active" : "Inactive") : "-"}
                            </Badge>
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Standard Full-Day Quantity (kg)</p>
                            <TruncatedCell value={selectedEstate?.fullDayQtyKg != null ? formatKg(selectedEstate.fullDayQtyKg) : "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Half-Day Standard Quantity (kg)</p>
                            <TruncatedCell value={selectedEstate?.halfDayQtyKg != null ? formatKg(selectedEstate.halfDayQtyKg) : "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Maximum Weight Transactions / Worker / Day</p>
                            <TruncatedCell value={selectedEstate?.maxDailyTransactions?.toString() ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Weight Variance (%)</p>
                            <TruncatedCell value={selectedEstate?.variancePercent != null ? `${formatVariance(selectedEstate.variancePercent)}%` : "-"} />
                        </div>
                    </div>
                </div>
                <Tabs defaultValue="CollectionPoints" className="flex w-full flex-col justify-start gap-4 px-4 pt-8 lg:px-6">
                    <TabsList>
                        <TabsTrigger value="CollectionPoints">Collection Points</TabsTrigger>
                        <TabsTrigger value="WorkTypes">Work Types</TabsTrigger>
                        <TabsTrigger value="GrantedUsers">Granted Users</TabsTrigger>
                    </TabsList>
                    <TabsContent value="CollectionPoints" className="flex flex-col gap-4 pb-8 outline-none">
                        {activeSelectedItemId ? (
                            // key resets search and open forms when another site is selected
                            <CollectionPointsTable key={activeSelectedItemId} estateId={activeSelectedItemId} />
                        ) : (
                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                Select a site to view its collection points.
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="WorkTypes" className="flex flex-col gap-4 pb-8 outline-none">
                        {activeSelectedItemId ? (
                            <WorkTypesTable key={activeSelectedItemId} estateId={activeSelectedItemId} />
                        ) : (
                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                Select a site to view its work types.
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="GrantedUsers" className="flex flex-col gap-4 pb-8 outline-none">
                        {activeSelectedItemId ? (
                            <GrantedUsersTable key={activeSelectedItemId} estateId={activeSelectedItemId} />
                        ) : (
                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                Select a site to view its granted users.
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
