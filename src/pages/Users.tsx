import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/weight-format";
import { PageTitle } from "@/components/page-title"
import { Input } from "@/components/ui/input"
import {
    IconSearch,
} from "@tabler/icons-react"
import React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { EmployeeDto, EstateDto, PermissionSetDto } from "@/api/generated/models"
import {
    getGetGrantedEstatesQueryKey,
    getGetPermissionSetsQueryKey,
    getGetUnassignedEstatesQueryKey,
    getGetUnassignedPermissionSetsQueryKey,
    useGetAllEmployees,
    useGetGrantedEstates,
    useGetPermissionSets,
    useGetUnassignedEstates,
    useGetUnassignedPermissionSets,
    useGrantEstates,
    useGrantPermissionSets,
    useRevokeEstates,
    useRevokePermissionSets,
} from "@/api/generated/endpoints/employee-controller/employee-controller"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { ButtonGroup } from "@/components/ui/button-group"
import { useQueryClient } from "@tanstack/react-query"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { EmployeeFormCard } from "@/components/employee-form-card"
import { EmployeeFaceCard } from "@/components/employee-face-card"
import { SetPasswordCard } from "@/components/set-password-card"

const TruncatedCell = ({ value, className = "max-w-xs" }: { value: string; className?: string }) => (
    <Tooltip>
        <TooltipTrigger render={<div className={`${className} truncate`} />}>{value || "-"}</TooltipTrigger>
        <TooltipContent className="max-w-[min(32rem,calc(100vw-2rem))] whitespace-normal wrap-break-word">
            {value || "-"}
        </TooltipContent>
    </Tooltip>
)


const statusLabel = (status?: string) =>
    status ? status.charAt(0) + status.slice(1).toLowerCase() : "-"

export const Users = () => {

    const queryClient = useQueryClient()
    // Buttons are shown only for granted endpoints; the backend still checks
    const { can } = useAuth()
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [view, setView] = React.useState("Permissions")
    const [permissionSearch, setPermissionSearch] = React.useState("")
    const [estateSearch, setEstateSearch] = React.useState("")
    const [unassignedPermissionSearch, setUnassignedPermissionSearch] = React.useState("")
    const [unassignedEstateSearch, setUnassignedEstateSearch] = React.useState("")
    const [isPermissionAssignmentOpen, setIsPermissionAssignmentOpen] = React.useState(false)
    const [isEstateAssignmentOpen, setIsEstateAssignmentOpen] = React.useState(false)
    const [employeeForm, setEmployeeForm] = React.useState<"new" | "edit" | "password" | "account" | null>(null)
    const closeEmployeeForm = React.useCallback(() => setEmployeeForm(null), [])
    const [selectedPermissionSetIds, setSelectedPermissionSetIds] = React.useState<string[]>([])
    const [selectedEstateIds, setSelectedEstateIds] = React.useState<string[]>([])
    const [selectedUnassignedPermissionSetIds, setSelectedUnassignedPermissionSetIds] = React.useState<string[]>([])
    const [selectedUnassignedEstateIds, setSelectedUnassignedEstateIds] = React.useState<string[]>([])
    const { mutate: revokePermissionSets, isPending: isRevokingPermissionSets } = useRevokePermissionSets()
    const { mutate: revokeEstates, isPending: isRevokingEstates } = useRevokeEstates()
    const { mutate: grantPermissionSets, isPending: isGrantingPermissionSets } = useGrantPermissionSets()
    const { mutate: grantEstates, isPending: isGrantingEstates } = useGrantEstates()
    const { data: employeesResponse } = useGetAllEmployees({ search: searchTerm })
    const employees = React.useMemo<EmployeeDto[]>(() => {
        const response = employeesResponse as unknown
        if (Array.isArray(response)) return response as EmployeeDto[]
        if (response && typeof response === "object" && "data" in response) {
            return Array.isArray(response.data) ? response.data as EmployeeDto[] : []
        }
        return []
    }, [employeesResponse])
    const activeSelectedItemId = employees.some(
        (item) => item.employeeCode === selectedItemId
    )
        ? selectedItemId
        : employees[0]?.employeeCode ?? null

    const selectedEmployee = employees.find(
        (item) => item.employeeCode === activeSelectedItemId
    )
    const hasUserAccount = Boolean(selectedEmployee?.hasUserAccount && activeSelectedItemId)
    const showFace = can("GET:/api/face-templates/{employeeCode}")
    const { data: permissionSetsResponse } = useGetPermissionSets(
        activeSelectedItemId ?? "",
        { search: permissionSearch || undefined },
        { query: { enabled: hasUserAccount } },
    )
    const { data: estatesResponse } = useGetGrantedEstates(
        activeSelectedItemId ?? "",
        { search: estateSearch || undefined },
        { query: { enabled: hasUserAccount } },
    )
    const { data: unassignedPermissionSetsResponse } = useGetUnassignedPermissionSets(
        activeSelectedItemId ?? "",
        { search: unassignedPermissionSearch || undefined },
        { query: { enabled: hasUserAccount } },
    )
    const { data: unassignedEstatesResponse } = useGetUnassignedEstates(
        activeSelectedItemId ?? "",
        { search: unassignedEstateSearch || undefined },
        { query: { enabled: hasUserAccount } },
    )
    const grantedPermissionSets = React.useMemo<PermissionSetDto[]>(() => {
        const response = permissionSetsResponse as unknown
        if (Array.isArray(response)) return response as PermissionSetDto[]
        if (response && typeof response === "object" && "data" in response) {
            return Array.isArray(response.data) ? response.data as PermissionSetDto[] : []
        }
        return []
    }, [permissionSetsResponse])
    const grantedEstates = React.useMemo<EstateDto[]>(() => {
        const response = estatesResponse as unknown
        if (Array.isArray(response)) return response as EstateDto[]
        if (response && typeof response === "object" && "data" in response) {
            return Array.isArray(response.data) ? response.data as EstateDto[] : []
        }
        return []
    }, [estatesResponse])
    const unassignedPermissionSets = React.useMemo<PermissionSetDto[]>(() => {
        const response = unassignedPermissionSetsResponse as unknown
        if (Array.isArray(response)) return response as PermissionSetDto[]
        if (response && typeof response === "object" && "data" in response) {
            return Array.isArray(response.data) ? response.data as PermissionSetDto[] : []
        }
        return []
    }, [unassignedPermissionSetsResponse])
    const unassignedEstates = React.useMemo<EstateDto[]>(() => {
        const response = unassignedEstatesResponse as unknown
        if (Array.isArray(response)) return response as EstateDto[]
        if (response && typeof response === "object" && "data" in response) {
            return Array.isArray(response.data) ? response.data as EstateDto[] : []
        }
        return []
    }, [unassignedEstatesResponse])
    const refreshPermissionSets = () => {
        if (!activeSelectedItemId) return
        void queryClient.invalidateQueries({
            queryKey: getGetPermissionSetsQueryKey(activeSelectedItemId, {
                search: permissionSearch || undefined,
            }),
        })
        void queryClient.invalidateQueries({
            queryKey: getGetUnassignedPermissionSetsQueryKey(activeSelectedItemId, {
                search: unassignedPermissionSearch || undefined,
            }),
        })
        setSelectedPermissionSetIds([])
        setSelectedUnassignedPermissionSetIds([])
    }
    const refreshEstates = () => {
        if (!activeSelectedItemId) return
        void queryClient.invalidateQueries({
            queryKey: getGetGrantedEstatesQueryKey(activeSelectedItemId, {
                search: estateSearch || undefined,
            }),
        })
        void queryClient.invalidateQueries({
            queryKey: getGetUnassignedEstatesQueryKey(activeSelectedItemId, {
                search: unassignedEstateSearch || undefined,
            }),
        })
        setSelectedEstateIds([])
        setSelectedUnassignedEstateIds([])
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
                            placeholder="Search Employees"
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 overflow-y-auto">
                    {employees.map((item) => {
                        const isSelected = activeSelectedItemId === item.employeeCode
                        return (
                            <React.Fragment key={item.employeeCode}>
                                <div className={`w-full text-left px-3 py-2 text-sm ${isSelected
                                    ? "bg-accent text-accent-foreground font-medium"
                                    : "hover:bg-muted/50 text-muted-foreground"
                                    }`}
                                    onClick={() => {
                                        setSelectedItemId(item.employeeCode ?? null)
                                        setSelectedPermissionSetIds([])
                                        setSelectedEstateIds([])
                                        setSelectedUnassignedPermissionSetIds([])
                                        setSelectedUnassignedEstateIds([])
                                    }}>
                                    <p className="truncate">
                                        {[item.firstName, item.lastName].filter(Boolean).join(" ") || item.employeeCode}
                                    </p>
                                    <p className={` truncate pt-1 text-sm text-muted-foreground ${isSelected ? "font-medium" : ""}`}>
                                        {item.employeeCode}
                                    </p>
                                </div>
                                <Separator />
                            </React.Fragment>
                        )
                    })}
                    {employees.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No employees found.
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
                        <span>Browse Employees...</span>
                    </Button>
                </div>

                <ButtonGroup className="px-4 lg:px-6 mb-2">
                    {can("PUT:/api/employees/{employeeCode}") && (
                        <Button variant="outline" size="lg" disabled={!selectedEmployee} onClick={() => setEmployeeForm("edit")}>
                            Edit
                        </Button>
                    )}
                    {/* Create User Account or Set New Password, whichever fits the selected employee */}
                    {can("POST:/api/users") && !hasUserAccount && (
                        <Button
                            variant="outline"
                            size="lg"
                            disabled={!selectedEmployee}
                            onClick={() => setEmployeeForm("account")}
                        >
                            Create User Account
                        </Button>
                    )}
                    {can("PUT:/api/employees/{employeeCode}/password") && hasUserAccount && (
                        <Button variant="outline" size="lg" onClick={() => setEmployeeForm("password")}>
                            Set New Password
                        </Button>
                    )}
                    {can("POST:/api/employees") && (
                        <Button variant="outline" size="lg" onClick={() => setEmployeeForm("new")}>
                            New Employee
                        </Button>
                    )}
                </ButtonGroup>
                {(employeeForm === "password" || employeeForm === "account") && activeSelectedItemId && (
                    <SetPasswordCard
                        employeeCode={activeSelectedItemId}
                        createAccount={employeeForm === "account"}
                        onClose={closeEmployeeForm}
                    />
                )}
                {(employeeForm === "new" || employeeForm === "edit") && (
                    <EmployeeFormCard
                        employee={employeeForm === "edit" ? selectedEmployee : undefined}
                        onClose={closeEmployeeForm}
                        onSaved={(employeeCode) => setSelectedItemId(employeeCode)}
                    />
                )}

                {/* Details, with the registered face beside them when the user may see faces */}
                <div className={`grid items-start gap-4 pt-0 px-4 lg:px-6 shrink-0 ${showFace ? "lg:grid-cols-[minmax(0,1fr)_18rem]" : ""}`}>
                    <div className={`grid auto-rows-min gap-4 sm:grid-cols-2 rounded-xl bg-muted/50 p-4 ${showFace ? "md:grid-cols-3 xl:grid-cols-4" : "md:grid-cols-6"}`}>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Employee No</p>
                            <TruncatedCell value={selectedEmployee?.employeeCode ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Full Name</p>
                            <TruncatedCell value={selectedEmployee?.firstName && selectedEmployee?.lastName ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">NIC</p>
                            <TruncatedCell value={selectedEmployee?.nic ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <TruncatedCell value={selectedEmployee?.phoneNumber ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Designation</p>
                            <TruncatedCell value={selectedEmployee?.designation ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Employment Category</p>
                            <TruncatedCell value={selectedEmployee?.employeeCategory ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Worker Status</p>
                            <Badge className={selectedEmployee?.employmentStatus?.toLowerCase() === "active"
                                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}>
                                {statusLabel(selectedEmployee?.employmentStatus)}
                            </Badge>
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Start Date</p>
                            <TruncatedCell value={selectedEmployee?.startDate ? formatDate(selectedEmployee.startDate) : "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">End Date</p>
                            <TruncatedCell value={selectedEmployee?.endDate ? formatDate(selectedEmployee.endDate) : "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Home Site</p>
                            <TruncatedCell value={selectedEmployee?.homeEstateId ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Default Site</p>
                            <TruncatedCell value={selectedEmployee?.defaultEstateId ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Default Collection Point</p>
                            <TruncatedCell value={selectedEmployee?.defaultCollectionPointCode ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Has User Account</p>
                            <Badge className={selectedEmployee?.hasUserAccount
                                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}>
                                {selectedEmployee?.hasUserAccount ? "YES" : "NO"}
                            </Badge>
                        </div>
                    </div>
                    {showFace && <EmployeeFaceCard key={activeSelectedItemId ?? ""} employeeCode={activeSelectedItemId ?? undefined} />}
                </div>
                <Tabs
                    value={view}
                    onValueChange={setView}
                    className="flex w-full flex-col justify-start gap-4 px-4 pt-8 lg:px-6"
                >
                    <div className="flex items-center justify-between">
                        <Label htmlFor="user-access-view-selector" className="sr-only">
                            View
                        </Label>
                        <Select value={view} onValueChange={(value) => value && setView(value)}>
                            <SelectTrigger className="flex w-fit lg:hidden" size="sm" id="user-access-view-selector">
                                <SelectValue placeholder="Select a view" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Permissions">Granted Permissions</SelectItem>
                                <SelectItem value="Sites">Granted Sites</SelectItem>
                            </SelectContent>
                        </Select>
                        <TabsList className="hidden lg:flex">
                            <TabsTrigger value="Permissions">Granted Permissions</TabsTrigger>
                            <TabsTrigger value="Sites">Granted Sites</TabsTrigger>
                        </TabsList>
                    </div>

                    {!hasUserAccount ? (
                        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                            A user account is required to view granted permissions and sites.
                        </div>
                    ) : (
                        <>
                            <TabsContent value="Permissions" className="flex flex-col gap-4 pb-8 outline-none">
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="search"
                                        placeholder="Search granted permissions"
                                        value={permissionSearch}
                                        onChange={(event) => setPermissionSearch(event.target.value)}
                                        className="max-w-sm"
                                        aria-label="Search granted permissions"
                                    />
                                    <Sheet open={isPermissionAssignmentOpen} onOpenChange={setIsPermissionAssignmentOpen}>
                                        <SheetTrigger render={<Button type="button" variant="outline" />}>Assign Permission Sets</SheetTrigger>
                                        <SheetContent side="right">
                                            <SheetHeader>
                                                <SheetTitle>Unassigned permission sets</SheetTitle>
                                                <SheetDescription>Permission sets not assigned to this employee.</SheetDescription>
                                            </SheetHeader>
                                            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
                                                <Input
                                                    type="search"
                                                    placeholder="Search unassigned permission sets"
                                                    value={unassignedPermissionSearch}
                                                    onChange={(event) => setUnassignedPermissionSearch(event.target.value)}
                                                    aria-label="Search unassigned permission sets"
                                                />
                                                {selectedUnassignedPermissionSetIds.length > 0 && (
                                                    <Button
                                                        type="button"
                                                        disabled={isGrantingPermissionSets}
                                                        onClick={() => {
                                                            grantPermissionSets(
                                                                { employeeCode: activeSelectedItemId ?? "", data: selectedUnassignedPermissionSetIds },
                                                                { onSuccess: refreshPermissionSets },
                                                            )
                                                        }}
                                                    >
                                                        {isGrantingPermissionSets ? "Granting..." : "Grant selected"}
                                                    </Button>
                                                )}
                                                <div className="rounded-lg border">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-8">
                                                                    <Checkbox
                                                                        checked={
                                                                            unassignedPermissionSets.length > 0 &&
                                                                            unassignedPermissionSets.every((permissionSet) => permissionSet.permissionSetId && selectedUnassignedPermissionSetIds.includes(permissionSet.permissionSetId))
                                                                        }
                                                                        onCheckedChange={(checked) => {
                                                                            const ids = unassignedPermissionSets.map((permissionSet) => permissionSet.permissionSetId).filter((id): id is string => Boolean(id))
                                                                            setSelectedUnassignedPermissionSetIds((current) => checked ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id)))
                                                                        }}
                                                                        aria-label="Select all unassigned permission sets"
                                                                    />
                                                                </TableHead>
                                                                <TableHead>Permission Set</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {unassignedPermissionSets.length ? unassignedPermissionSets.map((permissionSet) => (
                                                                <TableRow key={permissionSet.permissionSetId}>
                                                                    <TableCell>
                                                                        <Checkbox
                                                                            checked={Boolean(permissionSet.permissionSetId && selectedUnassignedPermissionSetIds.includes(permissionSet.permissionSetId))}
                                                                            onCheckedChange={(checked) => {
                                                                                if (!permissionSet.permissionSetId) return
                                                                                setSelectedUnassignedPermissionSetIds((current) => checked ? [...new Set([...current, permissionSet.permissionSetId as string])] : current.filter((id) => id !== permissionSet.permissionSetId))
                                                                            }}
                                                                            aria-label={`Select ${permissionSet.permissionSetId ?? "permission set"}`}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>{permissionSet.permissionSetId ?? "-"}</TableCell>
                                                                </TableRow>
                                                            )) : (
                                                                <TableRow><TableCell colSpan={2} className="h-24 text-center">No results.</TableCell></TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                </div>
                                <div className="relative rounded-lg border bg-background">
                                    {selectedPermissionSetIds.length > 0 && (
                                        <div className="flex items-center gap-2 border-b px-4 py-3">
                                            <Button
                                                type="button"
                                                disabled={isRevokingPermissionSets}
                                                onClick={() => {
                                                    revokePermissionSets(
                                                        {
                                                            employeeCode: activeSelectedItemId ?? "",
                                                            data: selectedPermissionSetIds,
                                                        },
                                                        { onSuccess: refreshPermissionSets },
                                                    )
                                                }}
                                            >
                                                {isRevokingPermissionSets ? "Revoking..." : "Revoke selected"}
                                            </Button>
                                        </div>
                                    )}
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-muted">
                                            <TableRow>
                                                <TableHead className="w-8">
                                                    <Checkbox
                                                        checked={
                                                            grantedPermissionSets.length > 0 &&
                                                            grantedPermissionSets.every((permissionSet) => permissionSet.permissionSetId && selectedPermissionSetIds.includes(permissionSet.permissionSetId))
                                                        }
                                                        onCheckedChange={(checked) => {
                                                            const ids = grantedPermissionSets
                                                                .map((permissionSet) => permissionSet.permissionSetId)
                                                                .filter((id): id is string => Boolean(id))
                                                            setSelectedPermissionSetIds((current) => checked
                                                                ? [...new Set([...current, ...ids])]
                                                                : current.filter((id) => !ids.includes(id)))
                                                        }}
                                                        aria-label="Select all granted permission sets"
                                                    />
                                                </TableHead>
                                                <TableHead>Permission Set</TableHead>
                                                <TableHead>Description</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {grantedPermissionSets.length ? grantedPermissionSets.map((permissionSet) => (
                                                <TableRow key={permissionSet.permissionSetId}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={Boolean(permissionSet.permissionSetId && selectedPermissionSetIds.includes(permissionSet.permissionSetId))}
                                                            onCheckedChange={(checked) => {
                                                                if (!permissionSet.permissionSetId) return
                                                                setSelectedPermissionSetIds((current) => checked
                                                                    ? [...new Set([...current, permissionSet.permissionSetId as string])]
                                                                    : current.filter((id) => id !== permissionSet.permissionSetId))
                                                            }}
                                                            aria-label={`Select ${permissionSet.permissionSetId ?? "permission set"}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{permissionSet.permissionSetId ?? "-"}</TableCell>
                                                    <TableCell>{permissionSet.description ?? "-"}</TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center">No results.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                            <TabsContent value="Sites" className="flex flex-col gap-4 pb-8 outline-none">
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="search"
                                        placeholder="Search granted sites"
                                        value={estateSearch}
                                        onChange={(event) => setEstateSearch(event.target.value)}
                                        className="max-w-sm"
                                        aria-label="Search granted sites"
                                    />
                                    <Sheet open={isEstateAssignmentOpen} onOpenChange={setIsEstateAssignmentOpen}>
                                        <SheetTrigger render={<Button type="button" variant="outline" />}>Assign Sites</SheetTrigger>
                                        <SheetContent side="right">
                                            <SheetHeader>
                                                <SheetTitle>Unassigned sites</SheetTitle>
                                                <SheetDescription>Sites not assigned to this employee.</SheetDescription>
                                            </SheetHeader>
                                            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
                                                <Input
                                                    type="search"
                                                    placeholder="Search unassigned sites"
                                                    value={unassignedEstateSearch}
                                                    onChange={(event) => setUnassignedEstateSearch(event.target.value)}
                                                    aria-label="Search unassigned sites"
                                                />
                                                {selectedUnassignedEstateIds.length > 0 && (
                                                    <Button
                                                        type="button"
                                                        disabled={isGrantingEstates}
                                                        onClick={() => {
                                                            grantEstates(
                                                                { employeeCode: activeSelectedItemId ?? "", data: selectedUnassignedEstateIds },
                                                                { onSuccess: refreshEstates },
                                                            )
                                                        }}
                                                    >
                                                        {isGrantingEstates ? "Granting..." : "Grant selected"}
                                                    </Button>
                                                )}
                                                <div className="rounded-lg border">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-8">
                                                                    <Checkbox
                                                                        checked={
                                                                            unassignedEstates.length > 0 &&
                                                                            unassignedEstates.every((estate) => estate.id && selectedUnassignedEstateIds.includes(estate.id))
                                                                        }
                                                                        onCheckedChange={(checked) => {
                                                                            const ids = unassignedEstates.map((estate) => estate.id).filter((id): id is string => Boolean(id))
                                                                            setSelectedUnassignedEstateIds((current) => checked ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id)))
                                                                        }}
                                                                        aria-label="Select all unassigned sites"
                                                                    />
                                                                </TableHead>
                                                                <TableHead>Site</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {unassignedEstates.length ? unassignedEstates.map((estate) => (
                                                                <TableRow key={estate.id}>
                                                                    <TableCell>
                                                                        <Checkbox
                                                                            checked={Boolean(estate.id && selectedUnassignedEstateIds.includes(estate.id))}
                                                                            onCheckedChange={(checked) => {
                                                                                if (!estate.id) return
                                                                                setSelectedUnassignedEstateIds((current) => checked ? [...new Set([...current, estate.id as string])] : current.filter((id) => id !== estate.id))
                                                                            }}
                                                                            aria-label={`Select ${estate.name ?? estate.id ?? "site"}`}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>{estate.name ?? estate.id ?? "-"}</TableCell>
                                                                </TableRow>
                                                            )) : (
                                                                <TableRow><TableCell colSpan={2} className="h-24 text-center">No results.</TableCell></TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                </div>
                                <div className="relative rounded-lg border bg-background">
                                    {selectedEstateIds.length > 0 && (
                                        <div className="flex items-center gap-2 border-b px-4 py-3">
                                            <Button
                                                type="button"
                                                disabled={isRevokingEstates}
                                                onClick={() => {
                                                    revokeEstates(
                                                        {
                                                            employeeCode: activeSelectedItemId ?? "",
                                                            data: selectedEstateIds,
                                                        },
                                                        { onSuccess: refreshEstates },
                                                    )
                                                }}
                                            >
                                                {isRevokingEstates ? "Revoking..." : "Revoke selected"}
                                            </Button>
                                        </div>
                                    )}
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-muted">
                                            <TableRow>
                                                <TableHead className="w-8">
                                                    <Checkbox
                                                        checked={
                                                            grantedEstates.length > 0 &&
                                                            grantedEstates.every((estate) => estate.id && selectedEstateIds.includes(estate.id))
                                                        }
                                                        onCheckedChange={(checked) => {
                                                            const ids = grantedEstates
                                                                .map((estate) => estate.id)
                                                                .filter((id): id is string => Boolean(id))
                                                            setSelectedEstateIds((current) => checked
                                                                ? [...new Set([...current, ...ids])]
                                                                : current.filter((id) => !ids.includes(id)))
                                                        }}
                                                        aria-label="Select all granted sites"
                                                    />
                                                </TableHead>
                                                <TableHead>Site</TableHead>
                                                <TableHead>Site Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {grantedEstates.length ? grantedEstates.map((estate) => (
                                                <TableRow key={estate.id}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={Boolean(estate.id && selectedEstateIds.includes(estate.id))}
                                                            onCheckedChange={(checked) => {
                                                                if (!estate.id) return
                                                                setSelectedEstateIds((current) => checked
                                                                    ? [...new Set([...current, estate.id as string])]
                                                                    : current.filter((id) => id !== estate.id))
                                                            }}
                                                            aria-label={`Select ${estate.name ?? estate.id ?? "site"}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{estate.name ?? estate.id ?? "-"}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{estate.active ? "Active" : "Inactive"}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center">No results.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </main>
        </div>


    )
}