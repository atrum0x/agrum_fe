import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import * as React from "react"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconCircleCheckFilled,
    IconDotsVertical,
    IconLayoutColumns,
    IconLoader,
    IconSearch,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"

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
import { z } from "zod"

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
    z.infer<typeof schema>
>()

export const schema = z.object({
    id: z.number(),
    header: z.string(),
    type: z.string(),
    status: z.string(),
    target: z.string(),
    limit: z.string(),
    reviewer: z.string(),
})

const columns = columnHelper.columns([
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
    columnHelper.accessor("header", {
        header: "Projection",
        cell: ({ row }) => <div className="w-32">{row.original.header}</div>,
        enableHiding: false,
    }),
    columnHelper.accessor("type", {
        header: "Section Type",
        cell: ({ row }) => (
            <div className="w-32">
                <Badge variant="outline" className="px-1.5 text-muted-foreground">
                    {row.original.type}
                </Badge>
            </div>
        ),
    }),
    columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => (
            <Badge variant="outline" className="px-1.5 text-muted-foreground">
                {row.original.status === "Done" ? (
                    <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
                ) : (
                    <IconLoader />
                )}
                {row.original.status}
            </Badge>
        ),
    }),
    columnHelper.accessor("target", {
        header: () => <div className="w-full text-right">Target</div>,
        cell: ({ row }) => (
            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
                        loading: `Saving ${row.original.header}`,
                        success: "Done",
                        error: "Error",
                    })
                }}
            >
                <Label htmlFor={`${row.original.id}-target`} className="sr-only">
                    Target
                </Label>
                <Input
                    className="h-8 w-16 border-transparent bg-transparent text-right shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background dark:bg-transparent dark:hover:bg-input/30 dark:focus-visible:bg-input/30"
                    defaultValue={row.original.target}
                    id={`${row.original.id}-target`}
                />
            </form>
        ),
    }),
    columnHelper.accessor("limit", {
        header: () => <div className="w-full text-right">Limit</div>,
        cell: ({ row }) => (
            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
                        loading: `Saving ${row.original.header}`,
                        success: "Done",
                        error: "Error",
                    })
                }}
            >
                <Label htmlFor={`${row.original.id}-limit`} className="sr-only">
                    Limit
                </Label>
                <Input
                    className="h-8 w-16 border-transparent bg-transparent text-right shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background dark:bg-transparent dark:hover:bg-input/30 dark:focus-visible:bg-input/30"
                    defaultValue={row.original.limit}
                    id={`${row.original.id}-limit`}
                />
            </form>
        ),
    }),
    columnHelper.accessor("reviewer", {
        header: "Reviewer",
        cell: ({ row }) => {
            const isAssigned = row.original.reviewer !== "Assign reviewer"
            if (isAssigned) {
                return row.original.reviewer
            }
            return (
                <>
                    <Label htmlFor={`${row.original.id}-reviewer`} className="sr-only">
                        Reviewer
                    </Label>
                    <Select>
                        <SelectTrigger
                            className="w-38 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
                            size="sm"
                            id={`${row.original.id}-reviewer`}
                        >
                            <SelectValue placeholder="Assign reviewer" />
                        </SelectTrigger>
                        <SelectContent align="end">
                            <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
                            <SelectItem value="Jamik Tashpulatov">
                                Jamik Tashpulatov
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </>
            )
        },
    }),
    columnHelper.display({
        id: "actions",
        cell: () => (
            <DropdownMenu>
                <DropdownMenuTrigger
                    className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
                    aria-label="Open menu"
                >
                    <IconDotsVertical />
                    <span className="sr-only">Open menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Make a copy</DropdownMenuItem>
                    <DropdownMenuItem>Favorite</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        ),
    }),
])
import permissionSetData from "./data.json"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export const PermissionSets = () => {

    const initialData = permissionSetData as z.infer<typeof schema>[]

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
    const [selectedItemId, setSelectedItemId] = React.useState<number | null>(initialData[0]?.id ?? null)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [view, setView] = React.useState("Granted")
    const filteredData = React.useMemo(() => {
        return initialData.filter((item) =>
            item.header.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [initialData, searchTerm])
    const table = useTable({
        features,
        data: filteredData,
        columns,
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
                    {filteredData.map((item) => {
                        const isSelected = selectedItemId === item.id
                        return (
                            <>
                                <div className={`w-full text-left px-3 py-2 text-sm ${isSelected
                                    ? "bg-accent text-accent-foreground font-medium"
                                    : "hover:bg-muted/50 text-muted-foreground"
                                    }`}
                                    onClick={() => setSelectedItemId(item.id)}>
                                    <p className="truncate">{item.header}</p>
                                    <p className={` truncate pt-1 text-xs text-muted-foreground ${isSelected ? "font-medium" : ""}`}>
                                        {item.reviewer}
                                    </p>
                                </div>
                                <Separator />
                            </>
                        )
                    })}
                    {filteredData.length === 0 && (
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

                <div className="flex flex-col gap-6 pt-0 px-4 lg:px-6 shrink-0">
                    <div className="grid auto-rows-min gap-4 sm:grid-cols-2 md:grid-cols-6 rounded-xl bg-muted/50 p-4 ">
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Permission Set</p>
                            <p className="truncate group-hover:absolute group-hover:top-6 group-hover:left-0 group-hover:z-20 group-hover:max-w-xs group-hover:rounded group-hover:bg-popover group-hover:p-2 group-hover:shadow-md group-hover:whitespace-normal group-hover:break-all">
                                Value
                            </p>
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Description</p>
                            <p className="truncate group-hover:absolute group-hover:top-6 group-hover:left-0 group-hover:z-20 group-hover:max-w-xs group-hover:rounded group-hover:bg-popover group-hover:p-2 group-hover:shadow-md group-hover:whitespace-normal group-hover:break-all">
                                Value
                            </p>
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Modified</p>
                            <p className="truncate group-hover:absolute group-hover:top-6 group-hover:left-0 group-hover:z-20 group-hover:max-w-xs group-hover:rounded group-hover:bg-popover group-hover:p-2 group-hover:shadow-md group-hover:whitespace-normal group-hover:break-all">
                                Value
                            </p>
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Modified By</p>
                            <p className="truncate group-hover:absolute group-hover:top-6 group-hover:left-0 group-hover:z-20 group-hover:max-w-xs group-hover:rounded group-hover:bg-popover group-hover:p-2 group-hover:shadow-md group-hover:whitespace-normal group-hover:break-all">
                                Value
                            </p>
                        </div>
                        
                    </div>
                    <div>
                    </div>
                </div>
                <Tabs
                    value={view}
                    onValueChange={setView}
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
                            </SelectContent>
                        </Select>
                        <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 lg:flex">
                            <TabsTrigger value="Granted">Granted</TabsTrigger>
                            <TabsTrigger value="Revoked">Revoked</TabsTrigger>
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
                    <TabsContent
                        value="Granted"
                        className="flex flex-col gap-4 px-4 lg:px-6 pb-8 outline-none"
                    >
                        <div className="rounded-lg border bg-background relative">
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
                                            table.setPageSize(Number(value))
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
                                    Page {table.state.pagination.pageIndex + 1} of{" "}
                                    {table.getPageCount()}
                                </div>
                                <div className="ml-auto flex items-center gap-2 lg:ml-0">
                                    <Button
                                        variant="outline"
                                        className="hidden h-8 w-8 p-0 lg:flex"
                                        type="button"
                                        onClick={() => table.setPageIndex(0)}
                                        disabled={!table.getCanPreviousPage()}
                                    >
                                        <span className="sr-only">Go to first page</span>
                                        <IconChevronsLeft />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="size-8"
                                        size="icon"
                                        type="button"
                                        onClick={() =>
                                            table.setPageIndex(
                                                Math.max(0, table.state.pagination.pageIndex - 1)
                                            )
                                        }
                                        disabled={!table.getCanPreviousPage()}
                                    >
                                        <span className="sr-only">Go to previous page</span>
                                        <IconChevronLeft />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="size-8"
                                        size="icon"
                                        type="button"
                                        onClick={() =>
                                            table.setPageIndex(table.state.pagination.pageIndex + 1)
                                        }
                                        disabled={!table.getCanNextPage()}
                                    >
                                        <span className="sr-only">Go to next page</span>
                                        <IconChevronRight />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="hidden size-8 lg:flex"
                                        size="icon"
                                        type="button"
                                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                        disabled={!table.getCanNextPage()}
                                    >
                                        <span className="sr-only">Go to last page</span>
                                        <IconChevronsRight />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>)
}