import React from "react"
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { errorMessage, notifyError } from "@/lib/notify"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { LovSelect } from "@/components/lov-select"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { codeAndText, divisionOptions } from "@/lib/lov-options"
import { useGetDivisions } from "@/api/generated/endpoints/division-controller/division-controller"
import {
    getGetFieldsQueryKey,
    useCreateField,
    useDeleteFields,
    useGetFields,
    useUpdateField,
} from "@/api/generated/endpoints/field-controller/field-controller"
import type { DivisionDto, FieldDto } from "@/api/generated/models"

const MAX_CODE_LENGTH = 30
const MAX_DESCRIPTION_LENGTH = 50

/** A row being added or edited in place. `key` is the saved code for existing rows. */
type Draft = {
    key: string
    isNew: boolean
    fieldCode: string
    divisionCode: string
    description: string
    isDefault: boolean
}

const toDraft = (field: FieldDto): Draft => ({
    key: field.fieldCode ?? "",
    isNew: false,
    fieldCode: field.fieldCode ?? "",
    divisionCode: field.divisionCode ?? "",
    description: field.description ?? "",
    isDefault: Boolean(field.isDefault),
})

const asList = <T,>(response: unknown): T[] => {
    if (Array.isArray(response)) return response as T[]
    if (response && typeof response === "object" && "data" in response) {
        return Array.isArray(response.data) ? response.data as T[] : []
    }
    return []
}

const ToolbarButton = ({ label, ...props }: { label: string } & React.ComponentProps<typeof Button>) => (
    <Tooltip>
        <TooltipTrigger render={<Button type="button" variant="outline" size="icon" aria-label={label} {...props} />} />
        <TooltipContent>{label}</TooltipContent>
    </Tooltip>
)

/** Site Basic Data – Fields tab (FSD v2.7 2.3 B.3; formerly Collection Points). */
export const FieldsTable = ({ estateId }: { estateId: string }) => {
    const queryClient = useQueryClient()
    const [search, setSearch] = React.useState("")
    const [divisionFilter, setDivisionFilter] = React.useState("")
    const [selectedCodes, setSelectedCodes] = React.useState<string[]>([])
    const [drafts, setDrafts] = React.useState<Draft[]>([])
    const [showInvalid, setShowInvalid] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
    const nextNewKey = React.useRef(0)

    const { data: response, isLoading } = useGetFields(estateId, {
        divisionCode: divisionFilter || undefined,
        search: search || undefined,
    })
    const { data: divisionsResponse } = useGetDivisions(estateId)
    const { mutateAsync: createField } = useCreateField({ mutation: { meta: { errorToast: false } } })
    const { mutateAsync: updateField } = useUpdateField({ mutation: { meta: { errorToast: false } } })
    const { mutate: deleteFields, isPending: isDeleting } = useDeleteFields()
    const fields = React.useMemo(() => asList<FieldDto>(response), [response])
    const divisions = React.useMemo(() => asList<DivisionDto>(divisionsResponse), [divisionsResponse])
    const divisionLov = React.useMemo(() => divisionOptions(divisions), [divisions])
    const divisionText = (code?: string) =>
        code ? codeAndText(code, divisions.find((division) => division.divisionCode === code)?.description) : "-"

    const isEditing = drafts.length > 0
    const draftByKey = new Map(drafts.filter((draft) => !draft.isNew).map((draft) => [draft.key, draft]))
    const newDrafts = drafts.filter((draft) => draft.isNew)
    const visibleCodes = fields.map((field) => field.fieldCode).filter((code): code is string => Boolean(code))
    // Selection can outlive a search or refetch; only act on rows that are still listed
    const activeSelection = selectedCodes.filter((code) => visibleCodes.includes(code))
    const refresh = () => queryClient.invalidateQueries({ queryKey: getGetFieldsQueryKey(estateId).slice(0, 1) })

    const updateDraft = (key: string, changes: Partial<Draft>) =>
        setDrafts((current) => {
            const edited = current.find((draft) => draft.key === key)
            const next = edited ? { ...edited, ...changes } : undefined
            return current.map((draft) => {
                if (draft.key === key) return next!
                // SB-10: one default per division, so another default in the same division is unticked
                return next?.isDefault && draft.isDefault && draft.divisionCode === next.divisionCode
                    ? { ...draft, isDefault: false }
                    : draft
            })
        })

    const addRow = () => {
        const key = `new-${nextNewKey.current++}`
        // New rows start in the filtered division, or the only one there is
        const divisionCode = divisionFilter || (divisions.length === 1 ? divisions[0].divisionCode ?? "" : "")
        setDrafts((current) => [
            { key, isNew: true, fieldCode: "", divisionCode, description: "", isDefault: false },
            ...current,
        ])
    }

    const editSelected = () => {
        const toEdit = fields.filter((field) => field.fieldCode && activeSelection.includes(field.fieldCode) && !draftByKey.has(field.fieldCode))
        setDrafts((current) => [...current, ...toEdit.map(toDraft)])
    }

    const cancel = () => {
        setDrafts([])
        setShowInvalid(false)
    }

    const isInvalid = (draft: Draft, field: "fieldCode" | "divisionCode" | "description") =>
        showInvalid && !draft[field].trim()

    const save = async () => {
        if (drafts.some((draft) => !draft.fieldCode.trim() || !draft.divisionCode || !draft.description.trim())) {
            setShowInvalid(true)
            return
        }
        setIsSaving(true)
        // Save new defaults last, so a default being replaced is cleared before its successor is saved
        const ordered = [...drafts].sort((a, b) => Number(a.isDefault) - Number(b.isDefault))
        const failed: Draft[] = []
        for (const draft of ordered) {
            const fieldCode = draft.fieldCode.trim()
            const data = {
                divisionCode: draft.divisionCode,
                description: draft.description.trim(),
                isDefault: draft.isDefault,
            }
            try {
                if (draft.isNew) {
                    await createField({ estateId, data: { fieldCode, ...data } })
                } else {
                    // The code can change only while nothing uses the field (SB-12); the server checks
                    await updateField({ estateId, fieldCode: draft.key, data: { fieldCode, ...data } })
                }
            } catch (error) {
                failed.push(draft)
                notifyError(`${fieldCode}: ${errorMessage(error, "Save failed")}`)
            }
        }
        await refresh()
        // Keep only the rows that failed open, in their original order
        setDrafts(drafts.filter((draft) => failed.includes(draft)))
        setShowInvalid(false)
        setIsSaving(false)
    }

    const deleteSelected = () => {
        deleteFields(
            { estateId, data: activeSelection },
            {
                onSuccess: () => {
                    setSelectedCodes([])
                    setIsDeleteOpen(false)
                    void refresh()
                },
            },
        )
    }

    const onDraftKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Enter") {
            event.preventDefault()
            void save()
        }
        if (event.key === "Escape") cancel()
    }

    const renderDraftCells = (draft: Draft) => (
        <>
            <TableCell>
                <Input
                    value={draft.fieldCode}
                    autoFocus={draft.isNew}
                    maxLength={MAX_CODE_LENGTH}
                    placeholder="Field *"
                    aria-label="Field"
                    aria-invalid={isInvalid(draft, "fieldCode") || undefined}
                    onChange={(event) => updateDraft(draft.key, { fieldCode: event.target.value })}
                    onKeyDown={onDraftKeyDown}
                    className="bg-background"
                />
            </TableCell>
            <TableCell>
                <LovSelect
                    value={draft.divisionCode}
                    onValueChange={(divisionCode) => updateDraft(draft.key, { divisionCode })}
                    options={divisionLov}
                    placeholder="Division *"
                    aria-label="Division"
                    invalid={isInvalid(draft, "divisionCode")}
                />
            </TableCell>
            <TableCell>
                <Input
                    value={draft.description}
                    autoFocus={!draft.isNew}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    placeholder="Field Description *"
                    aria-label="Field Description"
                    aria-invalid={isInvalid(draft, "description") || undefined}
                    onChange={(event) => updateDraft(draft.key, { description: event.target.value })}
                    onKeyDown={onDraftKeyDown}
                    className="bg-background"
                />
            </TableCell>
            <TableCell>
                <Checkbox
                    checked={draft.isDefault}
                    onCheckedChange={(checked) => updateDraft(draft.key, { isDefault: Boolean(checked) })}
                    aria-label={`Make ${draft.fieldCode || "the new field"} the default of its division`}
                />
            </TableCell>
        </>
    )

    const allSelected = visibleCodes.length > 0 && visibleCodes.every((code) => activeSelection.includes(code))

    return (
        <>
            <div className="flex flex-wrap items-center gap-4">
                <Input
                    type="search"
                    placeholder="Search fields"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="max-w-sm"
                    aria-label="Search fields"
                />
                <LovSelect
                    value={divisionFilter}
                    onValueChange={setDivisionFilter}
                    options={divisionLov}
                    clearLabel="All divisions"
                    aria-label="Division"
                    className="w-56"
                />
                <ButtonGroup>
                    <ToolbarButton label="Add field" onClick={addRow} disabled={isSaving || divisions.length === 0}>
                        <IconPlus />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Edit selected"
                        onClick={editSelected}
                        disabled={isSaving || activeSelection.every((code) => draftByKey.has(code))}
                    >
                        <IconPencil />
                    </ToolbarButton>
                    <Popover open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <PopoverTrigger
                                        render={
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                aria-label="Delete selected"
                                                disabled={isEditing || activeSelection.length === 0}
                                            />
                                        }
                                    />
                                }
                            >
                                <IconTrash />
                            </TooltipTrigger>
                            <TooltipContent>Delete selected</TooltipContent>
                        </Tooltip>
                        <PopoverContent align="start" className="w-72">
                            <PopoverHeader>
                                <PopoverTitle>
                                    Delete {activeSelection.length} field{activeSelection.length === 1 ? "" : "s"}?
                                </PopoverTitle>
                                <PopoverDescription>{activeSelection.join(", ")}</PopoverDescription>
                            </PopoverHeader>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                                <Button type="button" variant="destructive" size="sm" disabled={isDeleting} onClick={deleteSelected}>
                                    {isDeleting ? "Deleting..." : "Delete"}
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </ButtonGroup>
                {isEditing && (
                    <div className="flex gap-2">
                        <Button type="button" disabled={isSaving} onClick={() => void save()}>
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button type="button" variant="outline" disabled={isSaving} onClick={cancel}>
                            Cancel
                        </Button>
                    </div>
                )}
            </div>

            <div className="relative rounded-lg border bg-background">
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted">
                        <TableRow>
                            <TableHead className="w-8">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={(checked) => setSelectedCodes(checked ? visibleCodes : [])}
                                    aria-label="Select all fields"
                                />
                            </TableHead>
                            <TableHead className="w-48">Field</TableHead>
                            <TableHead className="w-56">Division</TableHead>
                            <TableHead>Field Description</TableHead>
                            <TableHead className="w-24">Default</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {newDrafts.map((draft) => (
                            <TableRow key={draft.key} className="bg-muted/50">
                                <TableCell />
                                {renderDraftCells(draft)}
                            </TableRow>
                        ))}
                        {fields.map((field) => {
                            const code = field.fieldCode ?? ""
                            const draft = draftByKey.get(code)
                            return (
                                <TableRow
                                    key={code}
                                    data-state={activeSelection.includes(code) ? "selected" : undefined}
                                    className={draft ? "bg-muted/50" : undefined}
                                >
                                    <TableCell>
                                        <Checkbox
                                            checked={activeSelection.includes(code)}
                                            onCheckedChange={(checked) => setSelectedCodes((current) => checked
                                                ? [...new Set([...current, code])]
                                                : current.filter((selected) => selected !== code))}
                                            aria-label={`Select ${code}`}
                                        />
                                    </TableCell>
                                    {draft ? renderDraftCells(draft) : (
                                        <>
                                            <TableCell>{code || "-"}</TableCell>
                                            <TableCell>{divisionText(field.divisionCode)}</TableCell>
                                            <TableCell>{field.description || "-"}</TableCell>
                                            <TableCell>
                                                {field.isDefault && (
                                                    <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">DEFAULT</Badge>
                                                )}
                                            </TableCell>
                                        </>
                                    )}
                                </TableRow>
                            )
                        })}
                        {fields.length === 0 && newDrafts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {isLoading ? "Loading..." : divisions.length === 0
                                        ? "Add a division on the Divisions tab first."
                                        : "No fields."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    )
}
