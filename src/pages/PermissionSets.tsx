import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconLayoutColumns,
    IconSearch,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
    getGetGrantedAppUsersQueryKey,
    getGetGrantedProjectionsQueryKey,
    getGetUnassignedAppUsersQueryKey,
    getGetUnassignedProjectionsQueryKey,
    useGetAllPermissionSets,
    useGetGrantedAppUsers,
    useGetGrantedProjections,
    useGetUnassignedAppUsers,
    useGetUnassignedProjections,
    useGrantPermissionSetToUser,
    useGrantProjectionsToPermissionSet,
    useRevokePermissionSetToUser,
    useRevokeProjectionsFromPermissionSet,
} from "@/api/generated/endpoints/permission-controller/permission-controller"
import type { AppUserDto, PermissionSetDto, ProjectionDto } from "@/api/generated/models"
import { useQueryClient } from "@tanstack/react-query"
import { ButtonGroup } from "@/components/ui/button-group"
import { PermissionSetFormCard } from "@/components/permission-set-form-card"

import {
    columnFilteringFeature,
    columnVisibilityFeature,
    createColumnHelper,
    createFilteredRowModel,
    createPaginatedRowModel,
    createSortedRowModel,
    FlexRender,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    tableFeatures,
    useTable,
    type ColumnFiltersState,
    type ColumnVisibilityState,
    type SortingState,
} from "@tanstack/react-table"
const features = tableFeatures({
    columnFilteringFeature,
    columnVisibilityFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    sortedRowModel: createSortedRowModel(),
})

const columnHelper = createColumnHelper<
    typeof features,
    PermissionSetTableRow
>()

type PermissionSetTableRow = {
    id: string
    header: string
    httpMethod: string
    urlPath: string
    description: string
}

const TruncatedCell = ({ value, className = "max-w-xs" }: { value: string; className?: string }) => (
    <Tooltip>
        <TooltipTrigger render={<div className={`${className} truncate`} />}>{value || "-"}</TooltipTrigger>
        <TooltipContent className="max-w-[min(32rem,calc(100vw-2rem))] whitespace-normal wrap-break-word">
            {value || "-"}
        </TooltipContent>
    </Tooltip>
)

const createColumns = (
) => columnHelper.columns([
    columnHelper.display({
        id: "select",
        header: ({ table }) => (
            <div className="flex items-center justify-center">
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected())
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            </div>
        ),
        cell: ({ row }) => (
            <div className="flex items-center justify-center">
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            </div>
        ),
        enableSorting: false,
        enableHiding: false,
    }),
    columnHelper.accessor("id", {
        header: "ID",
        cell: ({ row }) => <TruncatedCell value={row.original.id} className="max-w-40" />,
        enableHiding: false,
    }),
    columnHelper.accessor("header", {
        header: "Projection",
        cell: ({ row }) => <TruncatedCell value={row.original.header} className="max-w-48" />,
        enableHiding: false,
    }),
    columnHelper.accessor("httpMethod", {
        header: "HTTP Method",
        cell: ({ row }) => (
            <Badge variant="outline" className="px-1.5 text-muted-foreground">
                {row.original.httpMethod}
            </Badge>
        ),
    }),
    columnHelper.accessor("description", {
        header: "Description",
        cell: ({ row }) => <TruncatedCell value={row.original.description} className="max-w-64" />,
    }),
])
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

export const PermissionSets = () => {
    const queryClient = useQueryClient()
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] =
        React.useState<ColumnVisibilityState>({})
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10,
    })
    const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [projectionSearch, setProjectionSearch] = React.useState("")
    const [userSearch, setUserSearch] = React.useState("")
    const [isUnassignedUsersOpen, setIsUnassignedUsersOpen] = React.useState(false)
    const [unassignedUserSearch, setUnassignedUserSearch] = React.useState("")
    const [selectedGrantedUsernames, setSelectedGrantedUsernames] = React.useState<string[]>([])
    const [selectedUnassignedUsernames, setSelectedUnassignedUsernames] = React.useState<string[]>([])
    const [view, setView] = React.useState("Granted")
    const [permissionSetForm, setPermissionSetForm] = React.useState<"new" | "edit" | null>(null)
    const closePermissionSetForm = React.useCallback(() => setPermissionSetForm(null), [])
    const { mutate: grantUsers, isPending: isGrantingUsers } = useGrantPermissionSetToUser()
    const { mutate: revokeUsers, isPending: isRevokingUsers } = useRevokePermissionSetToUser()
    const { mutate: grantProjections, isPending: isGranting } = useGrantProjectionsToPermissionSet()
    const { mutate: revokeProjections, isPending: isRevoking } = useRevokeProjectionsFromPermissionSet()
    const { data: permissionSetsResponse } = useGetAllPermissionSets({ search: searchTerm })
    const permissionSets = React.useMemo<PermissionSetDto[]>(() => {
        const response = permissionSetsResponse as unknown
        if (Array.isArray(response)) return response as PermissionSetDto[]
        if (response && typeof response === "object" && "data" in response) {
            return Array.isArray(response.data) ? response.data as PermissionSetDto[] : []
        }
        return []
    }, [permissionSetsResponse])
    const activeSelectedItemId = permissionSets.some(
        (item) => item.permissionSetId === selectedItemId
    )
        ? selectedItemId
        : permissionSets[0]?.permissionSetId ?? null
    const selectedPermissionSet = permissionSets.find(
        (item) => item.permissionSetId === activeSelectedItemId
    )

    const projectionParams = {
        search: projectionSearch || undefined,
        pageable: {
            page: pagination.pageIndex,
            size: pagination.pageSize,
        },
    }
    const { data: grantedProjectionsResponse } = useGetGrantedProjections(
        activeSelectedItemId ?? "",
        projectionParams,
        { query: { enabled: Boolean(activeSelectedItemId) } }
    )
    const { data: revokedProjectionsResponse } = useGetUnassignedProjections(
        activeSelectedItemId ?? "",
        projectionParams,
        { query: { enabled: Boolean(activeSelectedItemId) } }
    )
    const { data: grantedUsersResponse } = useGetGrantedAppUsers(
        activeSelectedItemId ?? "",
        { search: userSearch || undefined },
        { query: { enabled: Boolean(activeSelectedItemId) } }
    )
    const grantedUsers = React.useMemo<AppUserDto[]>(() => {
        const response = grantedUsersResponse as unknown
        if (Array.isArray(response)) return response as AppUserDto[]
        if (response && typeof response === "object" && "data" in response) {
            return Array.isArray(response.data) ? response.data as AppUserDto[] : []
        }
        return []
    }, [grantedUsersResponse])
        const { data: unassignedUsersResponse } = useGetUnassignedAppUsers(
            activeSelectedItemId ?? "",
            { search: unassignedUserSearch || undefined },
            { query: { enabled: Boolean(activeSelectedItemId) } }
        )
        const unassignedUsers = React.useMemo<AppUserDto[]>(() => {
            const response = unassignedUsersResponse as unknown
            if (Array.isArray(response)) return response as AppUserDto[]
            if (response && typeof response === "object" && "data" in response) {
                return Array.isArray(response.data) ? response.data as AppUserDto[] : []
            }
            return []
        }, [unassignedUsersResponse])
    const getProjectionPage = React.useCallback((response: unknown) => {
        if (response && typeof response === "object" && "data" in response) {
            const data = response.data
            if (data && typeof data === "object" && "content" in data) {
                return data as {
                    content?: ProjectionDto[]
                    totalPages?: number
                    totalElements?: number
                    number?: number
                }
            }
        }
        if (response && typeof response === "object" && "content" in response) {
            return response as {
                content?: ProjectionDto[]
                totalPages?: number
                totalElements?: number
                number?: number
            }
        }
        return {}
    }, [])
    const projectionPage = React.useMemo(
        () => getProjectionPage(view === "Granted" ? grantedProjectionsResponse : revokedProjectionsResponse),
        [getProjectionPage, grantedProjectionsResponse, revokedProjectionsResponse, view]
    )
    const tableData = React.useMemo(() => {
        const projections = projectionPage.content ?? []
        return projections.map((projection) => ({
            id: String(projection.id ?? ""),
            header: projection.urlPath ?? "",
            httpMethod: projection.httpMethod ?? "",
            urlPath: projection.urlPath ?? "",
            description: projection.description ?? "",
        }))
    }, [projectionPage])
    const totalPages = projectionPage.totalElements !== undefined
        ? Math.ceil(projectionPage.totalElements / pagination.pageSize)
        : projectionPage.totalPages ?? 0
    const canGoToPreviousPage = pagination.pageIndex > 0
    const canGoToNextPage = pagination.pageIndex + 1 < totalPages
    const columns = React.useMemo(
        () => createColumns(),
        []
    )
    const table = useTable({
        features,
        data: tableData,
        columns,
        manualPagination: true,
        pageCount: totalPages,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
            pagination,
        },
        getRowId: (row) => row.id.toString(),
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
    })
    const selectedProjectionIds = table.getSelectedRowModel().rows.map(
        (row) => row.original.id
    )
    const hasSelectedProjections = selectedProjectionIds.length > 0
    const isUpdatingProjections = isGranting || isRevoking
    const isUpdatingUsers = isGrantingUsers || isRevokingUsers
    const refreshUserQueries = () => {
        if (!activeSelectedItemId) return

        void Promise.all([
            queryClient.invalidateQueries({
                queryKey: getGetGrantedAppUsersQueryKey(activeSelectedItemId, {
                    search: userSearch || undefined,
                }),
            }),
            queryClient.invalidateQueries({
                queryKey: getGetUnassignedAppUsersQueryKey(activeSelectedItemId, {
                    search: unassignedUserSearch || undefined,
                }),
            }),
        ])
        setSelectedGrantedUsernames([])
        setSelectedUnassignedUsernames([])
    }
    const refreshProjectionQueries = () => {
        if (!activeSelectedItemId) return

        void Promise.all([
            queryClient.invalidateQueries({
                queryKey: getGetGrantedProjectionsQueryKey(
                    activeSelectedItemId,
                    projectionParams,
                ),
            }),
            queryClient.invalidateQueries({
                queryKey: getGetUnassignedProjectionsQueryKey(
                    activeSelectedItemId,
                    projectionParams,
                ),
            }),
        ])
        setRowSelection({})
    }

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
                            placeholder="Search Permission Sets"
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 overflow-y-auto">
                    {permissionSets.map((item) => {
                        const isSelected = activeSelectedItemId === item.permissionSetId
                        return (
                            <React.Fragment key={item.permissionSetId}>
                                <div className={`w-full text-left px-3 py-2 text-sm ${isSelected
                                    ? "bg-accent text-accent-foreground font-medium"
                                    : "hover:bg-muted/50 text-muted-foreground"
                                    }`}
                                    onClick={() => {
                                        setSelectedItemId(item.permissionSetId ?? null)
                                        setPagination((current) => ({ ...current, pageIndex: 0 }))
                                    }}>
                                    <p className="truncate">{item.permissionSetId}</p>
                                    <p className={` truncate pt-1 text-xs text-muted-foreground ${isSelected ? "font-medium" : ""}`}>
                                        {item.description}
                                    </p>
                                </div>
                                <Separator />
                            </React.Fragment>
                        )
                    })}
                    {permissionSets.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No items found.
                        </div>
                    )}
                </ScrollArea>
            </aside>

            <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
                {/* MOBILE TOGGLE BUTTON (Hidden on Desktop) */}
                <div className="mb-6 flex lg:hidden">
                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-start gap-2 text-muted-foreground"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <IconSearch className="h-4 w-4" />
                        <span>Browse Permission Sets...</span>
                    </Button>
                </div>

                <ButtonGroup className="px-4 lg:px-6 mb-2">
                    <Button variant="outline" size="lg" disabled={!selectedPermissionSet} onClick={() => setPermissionSetForm("edit")}>
                        Edit
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => setPermissionSetForm("new")}>
                        New Permission Set
                    </Button>
                </ButtonGroup>
                {permissionSetForm && (
                    <PermissionSetFormCard
                        permissionSet={permissionSetForm === "edit" ? selectedPermissionSet : undefined}
                        onClose={closePermissionSetForm}
                        onSaved={(permissionSetId) => {
                            setSelectedItemId(permissionSetId)
                            setPagination((current) => ({ ...current, pageIndex: 0 }))
                        }}
                    />
                )}

                <div className="flex flex-col gap-6 pt-0 px-4 lg:px-6 shrink-0">
                    <div className="grid auto-rows-min gap-4 sm:grid-cols-2 md:grid-cols-6 rounded-xl bg-muted/50 p-4 ">
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Permission Set</p>
                            <TruncatedCell value={selectedPermissionSet?.permissionSetId ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Description</p>
                            <TruncatedCell value={selectedPermissionSet?.description ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Modified</p>
                            <TruncatedCell value={selectedPermissionSet?.modified ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Modified By</p>
                            <TruncatedCell value={selectedPermissionSet?.modifiedBy ?? "-"} />
                        </div>
                        
                    </div>
                    <div>
                    </div>
                </div>
                <Tabs
                    value={view}
                    onValueChange={(nextView) => {
                        setView(nextView)
                        setPagination((current) => ({ ...current, pageIndex: 0 }))
                    }}
                    className="flex flex-col w-full justify-start gap-4"
                >
                    <div className="flex items-center justify-between px-4 lg:px-6">
                        <Label htmlFor="view-selector" className="sr-only">
                            View
                        </Label>
                        <Select
                            value={view}
                            onValueChange={(value) => {
                                if (value !== null) setView(value)
                            }}
                        >
                            <SelectTrigger
                                className="flex w-fit lg:hidden"
                                size="sm"
                                id="view-selector"
                            >
                                <SelectValue placeholder="Select a view" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Granted">Granted</SelectItem>
                                <SelectItem value="Revoked">Revoked</SelectItem>
                                <SelectItem value="Users">Users</SelectItem>
                            </SelectContent>
                        </Select>
                        <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 lg:flex">
                            <TabsTrigger value="Granted">Granted</TabsTrigger>
                            <TabsTrigger value="Revoked">Revoked</TabsTrigger>
                            <TabsTrigger value="Users">Users</TabsTrigger>
                        </TabsList>
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border px-3 py-1 text-sm font-medium hover:bg-muted">
                                    <IconLayoutColumns />
                                    <span className="hidden lg:inline">Customize Columns</span>
                                    <span className="lg:hidden">Columns</span>
                                    <IconChevronDown />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    {table
                                        .getAllColumns()
                                        .filter(
                                            (column) =>
                                                typeof column.accessorFn !== "undefined" &&
                                                column.getCanHide()
                                        )
                                        .map((column) => {
                                            return (
                                                <DropdownMenuCheckboxItem
                                                    key={column.id}
                                                    className="capitalize"
                                                    checked={column.getIsVisible()}
                                                    onCheckedChange={(value) =>
                                                        column.toggleVisibility(!!value)
                                                    }
                                                >
                                                    {column.id}
                                                </DropdownMenuCheckboxItem>
                                            )
                                        })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    {view === "Users" ? (
                        <TabsContent
                            value="Users"
                            className="flex flex-col gap-4 px-4 lg:px-6 pb-8 outline-none"
                        >
                            <div className="flex items-center gap-4">
                                <Input
                                    type="search"
                                    placeholder="Search users"
                                    value={userSearch}
                                    onChange={(event) => setUserSearch(event.target.value)}
                                    className="max-w-sm"
                                    aria-label="Search users"
                                />
                                <Sheet open={isUnassignedUsersOpen} onOpenChange={setIsUnassignedUsersOpen}>
                                    <SheetTrigger
                                        render={<Button type="button" variant="outline" />}
                                    >
                                        Assign Users
                                    </SheetTrigger>
                                    <SheetContent side="right">
                                        <SheetHeader>
                                            <SheetTitle>Unassigned users</SheetTitle>
                                            <SheetDescription>
                                                Users without access to this permission set.
                                            </SheetDescription>
                                        </SheetHeader>
                                        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
                                            <Input
                                                type="search"
                                                placeholder="Search unassigned users"
                                                value={unassignedUserSearch}
                                                onChange={(event) => setUnassignedUserSearch(event.target.value)}
                                                aria-label="Search unassigned users"
                                            />
                                            {selectedUnassignedUsernames.length > 0 && (
                                                <Button
                                                    type="button"
                                                    disabled={isUpdatingUsers}
                                                    onClick={() => {
                                                        grantUsers(
                                                            {
                                                                permissionSetId: activeSelectedItemId ?? "",
                                                                data: selectedUnassignedUsernames,
                                                            },
                                                            { onSuccess: refreshUserQueries },
                                                        )
                                                    }}
                                                >
                                                    {isGrantingUsers ? "Granting..." : "Grant selected"}
                                                </Button>
                                            )}
                                            <div className="rounded-lg border">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-8">
                                                                <Checkbox
                                                                    checked={
                                                                        unassignedUsers.length > 0 &&
                                                                        unassignedUsers.every((user) => user.username && selectedUnassignedUsernames.includes(user.username))
                                                                    }
                                                                    onCheckedChange={(checked) => {
                                                                        const usernames = unassignedUsers
                                                                            .map((user) => user.username)
                                                                            .filter((username): username is string => Boolean(username))
                                                                        setSelectedUnassignedUsernames((current) => checked
                                                                            ? [...new Set([...current, ...usernames])]
                                                                            : current.filter((username) => !usernames.includes(username)))
                                                                    }}
                                                                    aria-label="Select all unassigned users"
                                                                />
                                                            </TableHead>
                                                            <TableHead>Username</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {unassignedUsers.length ? unassignedUsers.map((user) => (
                                                            <TableRow key={user.username}>
                                                                <TableCell>
                                                                    <Checkbox
                                                                        checked={Boolean(user.username && selectedUnassignedUsernames.includes(user.username))}
                                                                        onCheckedChange={(checked) => {
                                                                            if (!user.username) return
                                                                            setSelectedUnassignedUsernames((current) => checked
                                                                                ? [...new Set([...current, user.username as string])]
                                                                                : current.filter((username) => username !== user.username))
                                                                        }}
                                                                        aria-label={`Select ${user.username ?? "user"}`}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>{user.username ?? "-"}</TableCell>
                                                            </TableRow>
                                                        )) : (
                                                            <TableRow>
                                                                <TableCell colSpan={2} className="h-24 text-center">No results.</TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                            <div className="rounded-lg border bg-background relative">
                                {selectedGrantedUsernames.length > 0 && (
                                    <div className="flex items-center gap-2 border-b px-4 py-3">
                                        <Button
                                            type="button"
                                            disabled={isUpdatingUsers}
                                            onClick={() => {
                                                revokeUsers(
                                                    {
                                                        permissionSetId: activeSelectedItemId ?? "",
                                                        data: selectedGrantedUsernames,
                                                    },
                                                    { onSuccess: refreshUserQueries },
                                                )
                                            }}
                                        >
                                            {isRevokingUsers ? "Revoking..." : "Revoke selected"}
                                        </Button>
                                    </div>
                                )}
                                <Table>
                                    <TableHeader className="sticky top-0 z-10 bg-muted">
                                        <TableRow>
                                            <TableHead className="w-8">
                                                <Checkbox
                                                    checked={
                                                        grantedUsers.length > 0 &&
                                                        grantedUsers.every((user) => user.username && selectedGrantedUsernames.includes(user.username))
                                                    }
                                                    onCheckedChange={(checked) => {
                                                        const usernames = grantedUsers
                                                            .map((user) => user.username)
                                                            .filter((username): username is string => Boolean(username))
                                                        setSelectedGrantedUsernames((current) => checked
                                                            ? [...new Set([...current, ...usernames])]
                                                            : current.filter((username) => !usernames.includes(username)))
                                                    }}
                                                    aria-label="Select all granted users"
                                                />
                                            </TableHead>
                                            <TableHead>Username</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {grantedUsers.length ? grantedUsers.map((user) => (
                                            <TableRow key={user.username}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={Boolean(user.username && selectedGrantedUsernames.includes(user.username))}
                                                        onCheckedChange={(checked) => {
                                                            if (!user.username) return
                                                            setSelectedGrantedUsernames((current) => checked
                                                                ? [...new Set([...current, user.username as string])]
                                                                : current.filter((username) => username !== user.username))
                                                        }}
                                                        aria-label={`Select ${user.username ?? "user"}`}
                                                    />
                                                </TableCell>
                                                <TableCell>{user.username ?? "-"}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={2} className="h-24 text-center">No results.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    ) : (
                    <TabsContent
                        value={view}
                        className="flex flex-col gap-4 px-4 lg:px-6 pb-8 outline-none"
                    >
                        <Input
                            type="search"
                            placeholder="Search projections"
                            value={projectionSearch}
                            onChange={(event) => {
                                setProjectionSearch(event.target.value)
                                setPagination((current) => ({ ...current, pageIndex: 0 }))
                            }}
                            className="max-w-sm"
                            aria-label="Search projections"
                        />
                        <div className="rounded-lg border bg-background relative">
                            {hasSelectedProjections && (
                                <div className="flex items-center gap-2 border-b px-4 py-3">
                                    <Button
                                        type="button"
                                        disabled={isUpdatingProjections}
                                        onClick={() => {
                                            const mutation = view === "Granted"
                                                ? revokeProjections
                                                : grantProjections
                                            mutation(
                                                {
                                                    permissionSetId: activeSelectedItemId ?? "",
                                                    data: { projectionIds: selectedProjectionIds },
                                                },
                                                { onSuccess: refreshProjectionQueries }
                                            )
                                        }}
                                    >
                                        {view === "Granted" ? "Revoke selected" : "Grant selected"}
                                    </Button>
                                </div>
                            )}
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-muted">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => {
                                                return (
                                                    <TableHead key={header.id} colSpan={header.colSpan}>
                                                        {header.isPlaceholder ? null : (
                                                            <FlexRender header={header} />
                                                        )}
                                                    </TableHead>
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody className="**:data-[slot=table-cell]:first:w-8">
                                    {table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id}>
                                                        <FlexRender cell={cell} />
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={columns.length}
                                                className="h-24 text-center"
                                            >
                                                No results.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex items-center justify-between px-4 shrink-0">
                            <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
                                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                                {table.getFilteredRowModel().rows.length} row(s) selected.
                            </div>
                            <div className="flex w-full items-center gap-8 lg:w-fit">
                                <div className="hidden items-center gap-2 lg:flex">
                                    <Label htmlFor="rows-per-page" className="text-sm font-medium">
                                        Rows per page
                                    </Label>
                                    <Select
                                        value={`${table.state.pagination.pageSize}`}
                                        onValueChange={(value) => {
                                            setPagination({
                                                pageIndex: 0,
                                                pageSize: Number(value),
                                            })
                                        }}
                                    >
                                        <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                                            <SelectValue placeholder={table.state.pagination.pageSize} />
                                        </SelectTrigger>
                                        <SelectContent side="top">
                                            {[10, 20, 30, 40, 50].map((pageSize) => (
                                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                                    {pageSize}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex w-fit items-center justify-center text-sm font-medium">
                                    Page {pagination.pageIndex + 1} of {Math.max(totalPages, 1)}
                                </div>
                                <div className="ml-auto flex items-center gap-2 lg:ml-0">
                                    <Button
                                        variant="outline"
                                        className="hidden h-8 w-8 p-0 lg:flex"
                                        type="button"
                                        onClick={() => setPagination((current) => ({ ...current, pageIndex: 0 }))}
                                        disabled={!canGoToPreviousPage}
                                    >
                                        <span className="sr-only">Go to first page</span>
                                        <IconChevronsLeft />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="size-8"
                                        size="icon"
                                        type="button"
                                        onClick={() => setPagination((current) => ({
                                            ...current,
                                            pageIndex: Math.max(0, current.pageIndex - 1),
                                        }))}
                                        disabled={!canGoToPreviousPage}
                                    >
                                        <span className="sr-only">Go to previous page</span>
                                        <IconChevronLeft />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="size-8"
                                        size="icon"
                                        type="button"
                                        onClick={() => setPagination((current) => ({
                                            ...current,
                                            pageIndex: current.pageIndex + 1,
                                        }))}
                                        disabled={!canGoToNextPage}
                                    >
                                        <span className="sr-only">Go to next page</span>
                                        <IconChevronRight />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="hidden size-8 lg:flex"
                                        size="icon"
                                        type="button"
                                        onClick={() => setPagination((current) => ({
                                            ...current,
                                            pageIndex: Math.max(0, totalPages - 1),
                                        }))}
                                        disabled={!canGoToNextPage}
                                    >
                                        <span className="sr-only">Go to last page</span>
                                        <IconChevronsRight />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                    )}
                </Tabs>
            </main>
        </div>)
}