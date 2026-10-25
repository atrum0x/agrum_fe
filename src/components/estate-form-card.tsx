import React from "react"
import { IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LovSelect } from "@/components/lov-select"
import { getGetAllEstatesQueryKey, useCreateEstate, useUpdateEstate } from "@/api/generated/endpoints/estate-controller/estate-controller"
import type { Estate } from "@/api/generated/models"

// Numbers are kept as strings while editing so the inputs can be cleared
type EstateForm = {
    id: string
    name: string
    address: string
    active: boolean
    fullDayQtyKg: string
    halfDayQtyKg: string
    maxDailyTransactions: string
    variancePercent: string
}

type NumberKey = "fullDayQtyKg" | "halfDayQtyKg" | "maxDailyTransactions" | "variancePercent"

const toForm = (estate?: Estate): EstateForm => ({
    id: estate?.id ?? "",
    name: estate?.name ?? "",
    address: estate?.address ?? "",
    active: estate?.active ?? true,
    fullDayQtyKg: estate?.fullDayQtyKg?.toString() ?? "",
    halfDayQtyKg: estate?.halfDayQtyKg?.toString() ?? "",
    maxDailyTransactions: estate?.maxDailyTransactions?.toString() ?? "",
    variancePercent: estate?.variancePercent?.toString() ?? "",
})

const numberFields: { key: NumberKey; label: string; step: string }[] = [
    { key: "fullDayQtyKg", label: "Full Day Qty (kg)", step: "0.01" },
    { key: "halfDayQtyKg", label: "Half Day Qty (kg)", step: "0.01" },
    { key: "maxDailyTransactions", label: "Max Daily Transactions", step: "1" },
    { key: "variancePercent", label: "Variance %", step: "0.01" },
]

/** Create a site, or edit `estate` when one is given. Mount it only while it should be shown. */
export const EstateFormCard = ({
    estate,
    onClose,
    onSaved,
}: {
    estate?: Estate
    onClose: () => void
    onSaved?: (estateId: string) => void
}) => {
    const isEdit = Boolean(estate)
    const queryClient = useQueryClient()
    const [form, setForm] = React.useState(() => toForm(estate))
    const { mutate: createEstate, isPending: isCreating } = useCreateEstate()
    const { mutate: updateEstate, isPending: isUpdating } = useUpdateEstate()
    const isPending = isCreating || isUpdating

    const setField = <K extends keyof EstateForm>(key: K, value: EstateForm[K]) =>
        setForm((current) => ({ ...current, [key]: value }))

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [onClose])

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        const id = form.id.trim()
        // PUT replaces every field, so always send all of them
        const data = {
            name: form.name.trim(),
            address: form.address.trim() || undefined,
            active: form.active,
            fullDayQtyKg: Number(form.fullDayQtyKg),
            halfDayQtyKg: Number(form.halfDayQtyKg),
            maxDailyTransactions: Number(form.maxDailyTransactions),
            variancePercent: Number(form.variancePercent),
        }
        const onSuccess = () => {
            void queryClient.invalidateQueries({ queryKey: getGetAllEstatesQueryKey().slice(0, 1) })
            onSaved?.(id)
            onClose()
        }

        if (isEdit) {
            updateEstate({ estateId: id, data }, { onSuccess })
            return
        }
        createEstate({ data: { id, ...data } }, { onSuccess })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <Card className="relative z-10 w-full max-w-2xl shadow-xl">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <CardHeader className="border-b">
                        <CardTitle>{isEdit ? "Edit Site" : "New Site"}</CardTitle>
                        <CardDescription>
                            {isEdit ? `Update the details of ${estate?.name || estate?.id}.` : "Create a site."}
                        </CardDescription>
                        <CardAction>
                            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                                <IconX />
                            </Button>
                        </CardAction>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-4">
                        <div className="grid gap-4 rounded-xl bg-muted/50 p-4 md:grid-cols-2">
                            <Field>
                                <FieldLabel htmlFor="estate-form-id" className="text-muted-foreground">Site ID *</FieldLabel>
                                <Input
                                    id="estate-form-id"
                                    required
                                    // The ID is the primary key and cannot be changed
                                    disabled={isEdit}
                                    value={form.id}
                                    onChange={(event) => setField("id", event.target.value)}
                                    className="bg-background"
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="estate-form-name" className="text-muted-foreground">Name *</FieldLabel>
                                <Input
                                    id="estate-form-name"
                                    required
                                    value={form.name}
                                    onChange={(event) => setField("name", event.target.value)}
                                    className="bg-background"
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="estate-form-address" className="text-muted-foreground">Address</FieldLabel>
                                <Input
                                    id="estate-form-address"
                                    value={form.address}
                                    onChange={(event) => setField("address", event.target.value)}
                                    className="bg-background"
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="estate-form-status" className="text-muted-foreground">Status *</FieldLabel>
                                <LovSelect
                                    id="estate-form-status"
                                    value={form.active ? "ACTIVE" : "INACTIVE"}
                                    onValueChange={(value) => value && setField("active", value === "ACTIVE")}
                                    options={[
                                        { value: "ACTIVE", label: "ACTIVE" },
                                        { value: "INACTIVE", label: "INACTIVE" },
                                    ]}
                                />
                            </Field>
                            {numberFields.map(({ key, label, step }) => (
                                <Field key={key}>
                                    <FieldLabel htmlFor={`estate-form-${key}`} className="text-muted-foreground">{label} *</FieldLabel>
                                    <Input
                                        id={`estate-form-${key}`}
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step={step}
                                        required
                                        value={form[key]}
                                        onChange={(event) => setField(key, event.target.value)}
                                        className="bg-background"
                                    />
                                </Field>
                            ))}
                        </div>
                    </CardContent>

                    <CardFooter className="justify-end gap-2 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isPending}>
                            {isEdit
                                ? isPending ? "Saving..." : "Save Changes"
                                : isPending ? "Creating..." : "Create Site"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
