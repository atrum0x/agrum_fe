import React from "react"
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { errorMessage, notifyError } from "@/lib/notify"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
    getGetDivisionsQueryKey,
    useCreateDivision,
    useDeleteDivisions,
    useGetDivisions,
    useUpdateDivision,
} from "@/api/generated/endpoints/division-controller/division-controller"
import { getGetFieldsQueryKey } from "@/api/generated/endpoints/field-controller/field-controller"
import type { DivisionDto } from "@/api/generated/models"

const MAX_CODE_LENGTH = 30
const MAX_DESCRIPTION_LENGTH = 50

/** A row being added or edited in place. `key` is the saved code for existing rows. */
type Draft = {
    key: string
    isNew: boolean
    divisionCode: string
    description: string
}

const toDraft = (division: DivisionDto): Draft => ({
    key: division.divisionCode ?? "",
    isNew: false,
    divisionCode: division.divisionCode ?? "",
    description: division.description ?? "",
})

const ToolbarButton = ({ label, ...props }: { label: string } & React.ComponentProps<typeof Button>) => (
    <Tooltip>
        <TooltipTrigger render={<Button type="button" variant="outline" size="icon" aria-label={label} {...props} />} />
        <TooltipContent>{label}</TooltipContent>
    </Tooltip>
)

/** Site Basic Data – Divisions tab (FSD v2.7 2.3 B.2). */
export const DivisionsTable = ({ estateId }: { estateId: string }) => {
    const queryClient = useQueryClient()
    const [selectedCodes, setSelectedCodes] = React.useState<string[]>([])
    const [drafts, setDrafts] = React.useState<Draft[]>([])
    const [showInvalid, setShowInvalid] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
    const nextNewKey = React.useRef(0)

    const { data: response, isLoading } = useGetDivisions(estateId)
    const { mutateAsync: createDivision } = useCreateDivision({ mutation: { meta: { errorToast: false } } })
    const { mutateAsync: updateDivision } = useUpdateDivision({ mutation: { meta: { errorToast: false } } })
    const { mutate: deleteDivisions, isPending: isDeleting } = useDeleteDivisions()
    const divisions = React.useMemo<DivisionDto[]>(() => {
        const value = response as unknown
        if (Array.isArray(value)) return value as DivisionDto[]
        if (value && typeof value === "object" && "data" in value) {
            return Array.isArray(value.data) ? value.data as DivisionDto[] : []
        }
        return []
    }, [response])

    const isEditing = drafts.length > 0
    const draftByKey = new Map(drafts.filter((draft) => !draft.isNew).map((draft) => [draft.key, draft]))
    const newDrafts = drafts.filter((draft) => draft.isNew)
    const visibleCodes = divisions.map((division) => division.divisionCode).filter((code): code is string => Boolean(code))
    // Selection can outlive a refetch; only act on rows that are still listed
    const activeSelection = selectedCodes.filter((code) => visibleCodes.includes(code))
    const refresh = () => Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetDivisionsQueryKey(estateId) }),
        // The Fields tab shows division names
        queryClient.invalidateQueries({ queryKey: getGetFieldsQueryKey(estateId).slice(0, 1) }),
    ])

    const updateDraft = (key: string, changes: Partial<Draft>) =>
        setDrafts((current) => current.map((draft) => draft.key === key ? { ...draft, ...changes } : draft))

    const addRow = () => {
        const key = `new-${nextNewKey.current++}`
        setDrafts((current) => [{ key, isNew: true, divisionCode: "", description: "" }, ...current])
    }

    const editSelected = () => {
        const toEdit = divisions.filter((division) => division.divisionCode
            && activeSelection.includes(division.divisionCode) && !draftByKey.has(division.divisionCode))
        setDrafts((current) => [...current, ...toEdit.map(toDraft)])
    }

    const cancel = () => {
        setDrafts([])
        setShowInvalid(false)
    }

    const isInvalid = (draft: Draft, field: "divisionCode" | "description") => showInvalid && !draft[field].trim()

    const save = async () => {
        if (drafts.some((draft) => !draft.divisionCode.trim() || !draft.description.trim())) {
            setShowInvalid(true)
            return
        }
        setIsSaving(true)
        const failed: Draft[] = []
        for (const draft of drafts) {
            const divisionCode = draft.divisionCode.trim()
            const description = draft.description.trim()
            try {
                if (draft.isNew) {
                    await createDivision({ estateId, data: { divisionCode, description } })
                } else {
                    // The code can change only while nothing uses the division (SB-12); the server checks
                    await updateDivision({ estateId, divisionCode: draft.key, data: { divisionCode, description } })
                }
            } catch (error) {
                failed.push(draft)
                notifyError(`${divisionCode}: ${errorMessage(error, "Save failed")}`)
            }
        }
        await refresh()
        // Keep only the rows that failed open
        setDrafts(failed)
        setShowInvalid(false)
        setIsSaving(false)
    }

    const deleteSelected = () => {
        deleteDivisions(
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
                    value={draft.divisionCode}
                    autoFocus={draft.isNew}
                    maxLength={MAX_CODE_LENGTH}
                    placeholder="Division Code *"
                    aria-label="Division Code"
                    aria-invalid={isInvalid(draft, "divisionCode") || undefined}
                    onChange={(event) => updateDraft(draft.key, { divisionCode: event.target.value })}
                    onKeyDown={onDraftKeyDown}
                    className="bg-background"
                />
            </TableCell>
            <TableCell>
                <Input
                    value={draft.description}
                    autoFocus={!draft.isNew}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    placeholder="Division Description *"
                    aria-label="Division Description"
                    aria-invalid={isInvalid(draft, "description") || undefined}
                    onChange={(event) => updateDraft(draft.key, { description: event.target.value })}
                    onKeyDown={onDraftKeyDown}
                    className="bg-background"
                />
            </TableCell>
        </>
    )

    const allSelected = visibleCodes.length > 0 && visibleCodes.every((code) => activeSelection.includes(code))

    return (
        <>
            <div className="flex flex-wrap items-center gap-4">
                <ButtonGroup>
                    <ToolbarButton label="Add division" onClick={addRow} disabled={isSaving}>
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
                                    Delete {activeSelection.length} division{activeSelection.length === 1 ? "" : "s"}?
                                </PopoverTitle>
                                <PopoverDescription>
                                    {activeSelection.join(", ")}. A division that still has fields cannot be deleted.
                                </PopoverDescription>
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
                                    aria-label="Select all divisions"
                                />
                            </TableHead>
                            <TableHead className="w-48">Division Code</TableHead>
                            <TableHead>Division Description</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {newDrafts.map((draft) => (
                            <TableRow key={draft.key} className="bg-muted/50">
                                <TableCell />
                                {renderDraftCells(draft)}
                            </TableRow>
                        ))}
                        {divisions.map((division) => {
                            const code = division.divisionCode ?? ""
                            const draft = draftByKey.get(code)
                            const isSelected = activeSelection.includes(code)
                            return (
                                <TableRow
                                    key={code}
                                    data-state={isSelected ? "selected" : undefined}
                                    className={draft ? "bg-muted/50" : undefined}
                                >
                                    <TableCell>
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => setSelectedCodes((current) => checked
                                                ? [...new Set([...current, code])]
                                                : current.filter((selected) => selected !== code))}
                                            aria-label={`Select ${code || "division"}`}
                                        />
                                    </TableCell>
                                    {draft ? renderDraftCells(draft) : (
                                        <>
                                            <TableCell>{code || "-"}</TableCell>
                                            <TableCell>{division.description || "-"}</TableCell>
                                        </>
                                    )}
                                </TableRow>
                            )
                        })}
                        {divisions.length === 0 && newDrafts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    {isLoading ? "Loading..." : "No divisions. Add one before adding fields."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    )
}
