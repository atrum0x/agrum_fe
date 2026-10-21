import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
    IconSearch,
} from "@tabler/icons-react"
import React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { EmployeeDto } from "@/api/generated/models"
import { useGetAllEmployees } from "@/api/generated/endpoints/employee-controller/employee-controller"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { ButtonGroup } from "@/components/ui/button-group"
import { PlusIcon } from "lucide-react"

const TruncatedCell = ({ value, className = "max-w-xs" }: { value: string; className?: string }) => (
    <Tooltip>
        <TooltipTrigger render={<div className={`${className} truncate`} />}>{value || "-"}</TooltipTrigger>
        <TooltipContent className="max-w-[min(32rem,calc(100vw-2rem))] whitespace-normal wrap-break-word">
            {value || "-"}
        </TooltipContent>
    </Tooltip>
)

export const Users = () => {

    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null)
    const [searchTerm, setSearchTerm] = React.useState("")
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
                                    }}>
                                    <p className="truncate">
                                        {[item.firstName, item.lastName].filter(Boolean).join(" ") || item.employeeCode}
                                    </p>
                                    <p className={` truncate pt-1 text-xs text-muted-foreground ${isSelected ? "font-medium" : ""}`}>
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

                <ButtonGroup className="px-4 lg:px-6 mb-6">
                    <Button variant="outline" size="lg">
                        Edit
                    </Button>
                    <Button variant="outline" size="lg">
                        Set New Password
                    </Button>
                    <Button variant="outline" size="lg">
                        New Employee
                    </Button>
                </ButtonGroup>

                <div className="flex flex-col gap-6 pt-0 px-4 lg:px-6 shrink-0">
                    <div className="grid auto-rows-min gap-4 sm:grid-cols-2 md:grid-cols-6 rounded-xl bg-muted/50 p-4 ">
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Employee Code</p>
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
                            <p className="text-sm text-muted-foreground">Category</p>
                            <TruncatedCell value={selectedEmployee?.employeeCategory ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge className={selectedEmployee?.employmentStatus?.toLowerCase() === "active"
                                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}>
                                {selectedEmployee?.employmentStatus ?? "-"}
                            </Badge>
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">Start Date</p>
                            <TruncatedCell value={selectedEmployee?.startDate ?? "-"} />
                        </div>
                        <div className="relative min-w-0 group">
                            <p className="text-sm text-muted-foreground">End Date</p>
                            <TruncatedCell value={selectedEmployee?.startDate ?? "-"} />
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
                            <p className="text-sm text-muted-foreground">Has User Account</p>
                            <Badge className={selectedEmployee?.hasUserAccount
                                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}>
                                {selectedEmployee?.hasUserAccount ? "YES" : "NO"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </main>
        </div>


    )
}