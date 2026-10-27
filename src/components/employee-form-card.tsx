import React from "react"
import { IconCalendar, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { format, parse } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LovSelect, type LovOption } from "@/components/lov-select"
import { estateOptions } from "@/lib/lov-options"
import { getGetAllEmployeesQueryKey, useCreate1, useUpdate } from "@/api/generated/endpoints/employee-controller/employee-controller"
import { useGetAllEstates } from "@/api/generated/endpoints/estate-controller/estate-controller"
import { useGetCollectionPoints } from "@/api/generated/endpoints/collection-point-controller/collection-point-controller"
import { CreateEmployeeRequestEmployeeCategory, CreateEmployeeRequestEmploymentStatus } from "@/api/generated/models"
import type { CollectionPointDto, CreateEmployeeRequest, EmployeeDto, Estate, UpdateEmployeeRequest } from "@/api/generated/models"

const emptyForm: CreateEmployeeRequest = {
    employeeCode: "",
    firstName: "",
    lastName: "",
    nic: "",
    phoneNumber: "",
    designation: "",
    employeeCategory: undefined,
    employmentStatus: CreateEmployeeRequestEmploymentStatus.ACTIVE,
    startDate: "",
    endDate: "",
    homeEstateId: "",
    defaultEstateId: "",
    defaultCollectionPointCode: "",
    isUserAccount: false,
    password: "",
}

// The update endpoint replaces every field, so fields the form does not show
// (bank account) are carried over to avoid clearing them.
const toForm = (employee: EmployeeDto): CreateEmployeeRequest => ({
    ...emptyForm,
    employeeCode: employee.employeeCode ?? "",
    firstName: employee.firstName ?? "",
    lastName: employee.lastName ?? "",
    nic: employee.nic ?? "",
    phoneNumber: employee.phoneNumber ?? "",
    bankAccountNumber: employee.bankAccountNumber,
    designation: employee.designation ?? "",
    employeeCategory: employee.employeeCategory,
    employmentStatus: employee.employmentStatus ?? CreateEmployeeRequestEmploymentStatus.ACTIVE,
    startDate: employee.startDate ?? "",
    endDate: employee.endDate ?? "",
    homeEstateId: employee.homeEstateId ?? "",
    defaultEstateId: employee.defaultEstateId ?? "",
    defaultCollectionPointCode: employee.defaultCollectionPointCode ?? "",
})

const statusOptions: LovOption<CreateEmployeeRequestEmploymentStatus>[] =
    Object.values(CreateEmployeeRequestEmploymentStatus).map((status) => ({ value: status, label: status }))

// Employment Category, the default Attendance Category (FSD 2.4)
const categoryOptions: LovOption<CreateEmployeeRequestEmployeeCategory>[] =
    Object.values(CreateEmployeeRequestEmployeeCategory).map((category) => ({
        value: category,
        label: category.charAt(0) + category.slice(1).toLowerCase(),
    }))

type DateField = "startDate" | "endDate"

type TextField = "employeeCode" | "firstName" | "lastName" | "nic" | "phoneNumber" | "designation"

const textFields: { key: TextField; label: string; required?: boolean }[] = [
    { key: "employeeCode", label: "Employee No", required: true },
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name", required: true },
    { key: "nic", label: "NIC", required: true },
    { key: "phoneNumber", label: "Phone" },
    { key: "designation", label: "Designation" },
]

/** Create an employee, or edit `employee` when one is given. Mount it only while it should be shown. */
export const EmployeeFormCard = ({
    employee,
    onClose,
    onSaved,
}: {
    employee?: EmployeeDto
    onClose: () => void
    onSaved?: (employeeCode: string) => void
}) => {
    const isEdit = Boolean(employee)
    const queryClient = useQueryClient()
    const [form, setForm] = React.useState<CreateEmployeeRequest>(() => employee ? toForm(employee) : emptyForm)
    const [openDatePicker, setOpenDatePicker] = React.useState<DateField | null>(null)
    const [categoryMissing, setCategoryMissing] = React.useState(false)
    const toDate = (value?: string) => value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
    const { mutate: createEmployee, isPending: isCreating } = useCreate1()
    const { mutate: updateEmployee, isPending: isUpdating } = useUpdate()
    const isPending = isCreating || isUpdating
    const { data: estatesResponse } = useGetAllEstates()
    const estates = React.useMemo<Estate[]>(() => {
        const response = estatesResponse as unknown
        if (Array.isArray(response)) return response as Estate[]
        if (response && typeof response === "object" && "data" in response) {
            return Array.isArray(response.data) ? response.data as Estate[] : []
        }
        return []
    }, [estatesResponse])
    // The default collection point must belong to the default site
    const defaultEstateId = form.defaultEstateId ?? ""
    const { data: collectionPointsResponse } = useGetCollectionPoints(
        defaultEstateId,
        { search: "" },
        { query: { enabled: Boolean(defaultEstateId) } },
    )
    const collectionPoints = React.useMemo<CollectionPointDto[]>(() => {
        const response = collectionPointsResponse as unknown
        if (Array.isArray(response)) return response as CollectionPointDto[]
        if (response && typeof response === "object" && "data" in response) {
            return Array.isArray(response.data) ? response.data as CollectionPointDto[] : []
        }
        return []
    }, [collectionPointsResponse])

    React.useEffect(() => {
        // Let Escape close the date picker first instead of the whole card
        if (openDatePicker) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [openDatePicker, onClose])

    const setField = <K extends keyof CreateEmployeeRequest>(key: K, value: CreateEmployeeRequest[K]) =>
        setForm((current) => ({ ...current, [key]: value }))

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        // A dropdown is not covered by the browser's required check
        if (!form.employeeCategory) {
            setCategoryMissing(true)
            return
        }
        // Send blanks as null so optional fields are not stored as empty strings
        const data = Object.fromEntries(
            Object.entries(form).map(([key, value]) => [key, value === "" ? undefined : value]),
        ) as CreateEmployeeRequest
        const employeeCode = form.employeeCode ?? ""
        const onSuccess = () => {
            void queryClient.invalidateQueries({ queryKey: getGetAllEmployeesQueryKey().slice(0, 1) })
            onSaved?.(employeeCode)
            onClose()
        }

        if (isEdit) {
            const updateData: UpdateEmployeeRequest = {
                firstName: data.firstName,
                lastName: data.lastName,
                nic: data.nic,
                phoneNumber: data.phoneNumber,
                bankAccountNumber: data.bankAccountNumber,
                designation: data.designation,
                employeeCategory: data.employeeCategory,
                employmentStatus: data.employmentStatus,
                startDate: data.startDate,
                endDate: data.endDate,
                defaultEstateId: data.defaultEstateId,
                defaultCollectionPointCode: data.defaultCollectionPointCode,
                homeEstateId: data.homeEstateId,
            }
            updateEmployee({ employeeCode, data: updateData }, { onSuccess })
            return
        }
        if (!data.isUserAccount) data.password = undefined
        createEmployee({ data }, { onSuccess })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <Card className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col shadow-xl">
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
                    <CardHeader className="border-b">
                        <CardTitle>{isEdit ? "Edit Employee" : "New Employee"}</CardTitle>
                        <CardDescription>
                            {isEdit
                                ? `Update the details of ${employee?.employeeCode}.`
                                : "Create an employee and, optionally, a user account to log in with."}
                        </CardDescription>
                        <CardAction>
                            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                                <IconX />
                            </Button>
                        </CardAction>
                    </CardHeader>

                    <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
                        {categoryMissing && !form.employeeCategory && (
                            <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
                                Please select the Employment Category.
                            </div>
                        )}
                        <div className="grid auto-rows-min gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-2 md:grid-cols-3">
                            {textFields.map(({ key, label, required }) => (
                                <Field key={key}>
                                    <FieldLabel htmlFor={`employee-form-${key}`} className="text-muted-foreground">
                                        {label}{required && " *"}
                                    </FieldLabel>
                                    <Input
                                        id={`employee-form-${key}`}
                                        required={required}
                                        // The employee code is the primary key and cannot be changed
                                        disabled={isEdit && key === "employeeCode"}
                                        value={form[key] ?? ""}
                                        onChange={(event) => setField(key, event.target.value)}
                                        className="bg-background"
                                    />
                                </Field>
                            ))}
                            <Field>
                                <FieldLabel htmlFor="employee-form-category" className="text-muted-foreground">Employment Category *</FieldLabel>
                                <LovSelect
                                    id="employee-form-category"
                                    value={form.employeeCategory ?? ""}
                                    onValueChange={(value) => value && setField("employeeCategory", value)}
                                    options={categoryOptions}
                                    placeholder="Select a category"
                                    invalid={categoryMissing && !form.employeeCategory}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="employee-form-status" className="text-muted-foreground">Worker Status</FieldLabel>
                                <LovSelect
                                    id="employee-form-status"
                                    value={form.employmentStatus ?? ""}
                                    onValueChange={(value) => value && setField("employmentStatus", value)}
                                    options={statusOptions}
                                />
                            </Field>
                            {([
                                ["startDate", "Start Date *"],
                                ["endDate", "End Date"],
                            ] as const).map(([key, label]) => {
                                const value = toDate(form[key])
                                return (
                                    <Field key={key}>
                                        <FieldLabel htmlFor={`employee-form-${key}`} className="text-muted-foreground">{label}</FieldLabel>
                                        <Popover
                                            open={openDatePicker === key}
                                            onOpenChange={(open) => setOpenDatePicker(open ? key : null)}
                                        >
                                            <PopoverTrigger
                                                render={
                                                    <Button
                                                        id={`employee-form-${key}`}
                                                        type="button"
                                                        variant="outline"
                                                        className="w-full justify-between bg-background font-normal"
                                                    />
                                                }
                                            >
                                                <span className={value ? "" : "text-muted-foreground"}>
                                                    {value ? format(value, "dd/MM/yyyy") : "Select a date"}
                                                </span>
                                                <IconCalendar className="text-muted-foreground" />
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={value}
                                                    defaultMonth={value ?? toDate(form.startDate)}
                                                    captionLayout="dropdown"
                                                    // An employee cannot leave before they started
                                                    disabled={key === "endDate" && form.startDate ? { before: toDate(form.startDate)! } : undefined}
                                                    onSelect={(date) => {
                                                        setField(key, date ? format(date, "yyyy-MM-dd") : "")
                                                        setOpenDatePicker(null)
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </Field>
                                )
                            })}
                            {([
                                ["homeEstateId", "Home Site *"],
                                ["defaultEstateId", "Default Site *"],
                            ] as const).map(([key, label]) => (
                                <Field key={key}>
                                    <FieldLabel htmlFor={`employee-form-${key}`} className="text-muted-foreground">{label}</FieldLabel>
                                    <LovSelect
                                        id={`employee-form-${key}`}
                                        value={form[key] ?? ""}
                                        onValueChange={(value) => setForm((current) => ({
                                            ...current,
                                            [key]: value,
                                            // A collection point from the previous default site no longer applies
                                            ...(key === "defaultEstateId" && value !== current.defaultEstateId
                                                ? { defaultCollectionPointCode: "" }
                                                : {}),
                                        }))}
                                        options={estateOptions(estates)}
                                        placeholder="Select a site"
                                    />
                                </Field>
                            ))}
                            <Field>
                                <FieldLabel htmlFor="employee-form-defaultCollectionPointCode" className="text-muted-foreground">
                                    Default Collection Point
                                </FieldLabel>
                                <LovSelect
                                    id="employee-form-defaultCollectionPointCode"
                                    value={form.defaultCollectionPointCode ?? ""}
                                    onValueChange={(value) => setField("defaultCollectionPointCode", value)}
                                    options={collectionPoints
                                        .filter((point) => point.cpCode)
                                        .map((point) => ({
                                            value: point.cpCode!,
                                            label: point.name ?? point.cpCode!,
                                            hint: point.isDefault ? " (site default)" : undefined,
                                        }))}
                                    placeholder={defaultEstateId ? "Select a collection point" : "Select a default site first"}
                                    disabled={!defaultEstateId}
                                />
                            </Field>
                        </div>

                        {!isEdit && (
                            <div className="grid auto-rows-min gap-4 rounded-xl border p-4 sm:grid-cols-2 md:grid-cols-3">
                                <Field orientation="horizontal" className="items-center self-end">
                                    <Checkbox
                                        id="employee-form-isUserAccount"
                                        checked={Boolean(form.isUserAccount)}
                                        onCheckedChange={(checked) => setField("isUserAccount", checked)}
                                    />
                                    <FieldLabel htmlFor="employee-form-isUserAccount">Create user account</FieldLabel>
                                </Field>
                                {form.isUserAccount && (
                                    <Field>
                                        <Input
                                            id="employee-form-password"
                                            type="password"
                                            placeholder="Password *"
                                            aria-label="Password"
                                            required
                                            autoComplete="new-password"
                                            value={form.password ?? ""}
                                            onChange={(event) => setField("password", event.target.value)}
                                        />
                                    </Field>
                                )}
                                <p className="text-sm text-muted-foreground sm:col-span-2 md:col-span-3">
                                    The username will be the employee code.
                                </p>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="justify-end gap-2 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isPending}>
                            {isEdit
                                ? isPending ? "Saving..." : "Save Changes"
                                : isPending ? "Creating..." : "Create Employee"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
