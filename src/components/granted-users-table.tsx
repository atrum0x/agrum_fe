import React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    getGetGrantedUsersQueryKey,
    getGetUnassignedUsersQueryKey,
    useGetGrantedUsers,
    useGetUnassignedUsers,
    useGrantUsers,
    useRevokeUsers,
} from "@/api/generated/endpoints/estate-controller/estate-controller"
import type { EmployeeDto } from "@/api/generated/models"

const toEmployees = (response: unknown): EmployeeDto[] => {
    if (Array.isArray(response)) return response as EmployeeDto[]
    if (response && typeof response === "object" && "data" in response) {
        return Array.isArray(response.data) ? response.data as EmployeeDto[] : []
    }
    return []
}

const fullName = (employee: EmployeeDto) =>
    [employee.firstName, employee.lastName].filter(Boolean).join(" ") || "-"

const codesOf = (employees: EmployeeDto[]) =>
    employees.map((employee) => employee.employeeCode).filter((code): code is string => Boolean(code))

/** Users (employees with a login) granted access to a site. Mirrors the Users page's Granted Sites tab. */
export const GrantedUsersTable = ({ estateId }: { estateId: string }) => {
    const queryClient = useQueryClient()
    const [search, setSearch] = React.useState("")
    const [unassignedSearch, setUnassignedSearch] = React.useState("")
    const [isAssignOpen, setIsAssignOpen] = React.useState(false)
    const [selectedCodes, setSelectedCodes] = React.useState<string[]>([])
    const [selectedUnassignedCodes, setSelectedUnassignedCodes] = React.useState<string[]>([])

    const { data: grantedResponse, isLoading, error: listError } = useGetGrantedUsers(estateId, { search: search || undefined })
    const { data: unassignedResponse } = useGetUnassignedUsers(
        estateId,
        { search: unassignedSearch || undefined },
        { query: { enabled: isAssignOpen } },
    )
    const { mutate: grantUsers, isPending: isGranting, error: grantError } = useGrantUsers()
    const { mutate: revokeUsers, isPending: isRevoking, error: revokeError } = useRevokeUsers()
    const grantedUsers = React.useMemo(() => toEmployees(grantedResponse), [grantedResponse])
    const unassignedUsers = React.useMemo(() => toEmployees(unassignedResponse), [unassignedResponse])
    const grantedCodes = codesOf(grantedUsers)
    const unassignedCodes = codesOf(unassignedUsers)

    const refresh = () => {
        void queryClient.invalidateQueries({ queryKey: getGetGrantedUsersQueryKey(estateId).slice(0, 1) })
        void queryClient.invalidateQueries({ queryKey: getGetUnassignedUsersQueryKey(estateId).slice(0, 1) })
        // The Users page shows the same grants from the employee side
        void queryClient.invalidateQueries({
            predicate: (query) => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/employees/"),
        })
        setSelectedCodes([])
        setSelectedUnassignedCodes([])
    }

    const error = listError ?? revokeError

    return (
        <>
            <div className="flex items-center gap-4">
                <Input
                    type="search"
                    placeholder="Search granted users"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="max-w-sm"
                    aria-label="Search granted users"
                />
                <Sheet open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                    <SheetTrigger render={<Button type="button" variant="outline" />}>Assign Users</SheetTrigger>
                    <SheetContent side="right">
                        <SheetHeader>
                            <SheetTitle>Unassigned users</SheetTitle>
                            <SheetDescription>Users without access to this site. Only employees with a user account are listed.</SheetDescription>
                        </SheetHeader>
                        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
                            <Input
                                type="search"
                                placeholder="Search unassigned users"
                                value={unassignedSearch}
                                onChange={(event) => setUnassignedSearch(event.target.value)}
                                aria-label="Search unassigned users"
                            />
                            {grantError instanceof Error && (
                                <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
                                    {grantError.message}
                                </div>
                            )}
                            {selectedUnassignedCodes.length > 0 && (
                                <Button
                                    type="button"
                                    disabled={isGranting}
                                    onClick={() => grantUsers({ estateId, data: selectedUnassignedCodes }, { onSuccess: refresh })}
                                >
                                    {isGranting ? "Granting..." : "Grant selected"}
                                </Button>
                            )}
                            <div className="rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-8">
                                                <Checkbox
                                                    checked={unassignedCodes.length > 0 && unassignedCodes.every((code) => selectedUnassignedCodes.includes(code))}
                                                    onCheckedChange={(checked) => setSelectedUnassignedCodes((current) => checked
                                                        ? [...new Set([...current, ...unassignedCodes])]
                                                        : current.filter((code) => !unassignedCodes.includes(code)))}
                                                    aria-label="Select all unassigned users"
                                                />
                                            </TableHead>
                                            <TableHead>User</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {unassignedUsers.length ? unassignedUsers.map((employee) => {
                                            const code = employee.employeeCode ?? ""
                                            return (
                                                <TableRow key={code}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedUnassignedCodes.includes(code)}
                                                            onCheckedChange={(checked) => setSelectedUnassignedCodes((current) => checked
                                                                ? [...new Set([...current, code])]
                                                                : current.filter((selected) => selected !== code))}
                                                            aria-label={`Select ${code}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="truncate">{fullName(employee)}</p>
                                                        <p className="truncate pt-1 text-xs text-muted-foreground">{code}</p>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        }) : (
                                            <TableRow><TableCell colSpan={2} className="h-24 text-center">No results.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {error instanceof Error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
                    {error.message}
                </div>
            )}

            <div className="relative rounded-lg border bg-background">
                {selectedCodes.length > 0 && (
                    <div className="flex items-center gap-2 border-b px-4 py-3">
                        <Button
                            type="button"
                            disabled={isRevoking}
                            onClick={() => revokeUsers({ estateId, data: selectedCodes }, { onSuccess: refresh })}
                        >
                            {isRevoking ? "Revoking..." : "Revoke selected"}
                        </Button>
                    </div>
                )}
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted">
                        <TableRow>
                            <TableHead className="w-8">
                                <Checkbox
                                    checked={grantedCodes.length > 0 && grantedCodes.every((code) => selectedCodes.includes(code))}
                                    onCheckedChange={(checked) => setSelectedCodes((current) => checked
                                        ? [...new Set([...current, ...grantedCodes])]
                                        : current.filter((code) => !grantedCodes.includes(code)))}
                                    aria-label="Select all granted users"
                                />
                            </TableHead>
                            <TableHead>Employee Code</TableHead>
                            <TableHead>Full Name</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {grantedUsers.length ? grantedUsers.map((employee) => {
                            const code = employee.employeeCode ?? ""
                            const isSelected = selectedCodes.includes(code)
                            return (
                                <TableRow key={code} data-state={isSelected ? "selected" : undefined}>
                                    <TableCell>
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => setSelectedCodes((current) => checked
                                                ? [...new Set([...current, code])]
                                                : current.filter((selected) => selected !== code))}
                                            aria-label={`Select ${code}`}
                                        />
                                    </TableCell>
                                    <TableCell>{code || "-"}</TableCell>
                                    <TableCell>{fullName(employee)}</TableCell>
                                    <TableCell>{employee.designation || "-"}</TableCell>
                                    <TableCell>
                                        <Badge className={employee.employmentStatus?.toLowerCase() === "active"
                                            ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                            : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}>
                                            {employee.employmentStatus ?? "-"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )
                        }) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {isLoading ? "Loading..." : "No results."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    )
}
