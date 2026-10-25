import React from "react"
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { errorMessage, notifyError } from "@/lib/notify"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
    getGetWorkTypesQueryKey,
    useCreateWorkType,
    useDeleteWorkTypes,
    useGetWorkTypes,
    useUpdateWorkType,
} from "@/api/generated/endpoints/work-type-controller/work-type-controller"
import type { WorkTypeDto } from "@/api/generated/models"

const MAX_WORK_TYPE_LENGTH = 50

/** A row being added or edited in place. `key` is the work type code for existing rows. */
type Draft = {
    key: string
    isNew: boolean
    workType: string
    weighingRequired: boolean
}

const toDraft = (workType: WorkTypeDto): Draft => ({
    key: workType.workType ?? "",
    isNew: false,
    workType: workType.workType ?? "",
    weighingRequired: Boolean(workType.weighingRequired),
})

const ToolbarButton = ({ label, ...props }: { label: string } & React.ComponentProps<typeof Button>) => (
    <Tooltip>
        <TooltipTrigger render={<Button type="button" variant="outline" size="icon" aria-label={label} {...props} />} />
        <TooltipContent>{label}</TooltipContent>
    </Tooltip>
)

export const WorkTypesTable = ({ estateId }: { estateId: string }) => {
    const queryClient = useQueryClient()
    const [selectedCodes, setSelectedCodes] = React.useState<string[]>([])
    const [drafts, setDrafts] = React.useState<Draft[]>([])
    const [showInvalid, setShowInvalid] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
    const nextNewKey = React.useRef(0)

    const { data: response, isLoading } = useGetWorkTypes(estateId)
    const { mutateAsync: createWorkType } = useCreateWorkType({ mutation: { meta: { errorToast: false } } })
    const { mutateAsync: updateWorkType } = useUpdateWorkType({ mutation: { meta: { errorToast: false } } })
    const { mutate: deleteWorkTypes, isPending: isDeleting } = useDeleteWorkTypes()
    const workTypes = React.useMemo<WorkTypeDto[]>(() => {
        const value = response as unknown
        if (Array.isArray(value)) return value as WorkTypeDto[]
        if (value && typeof value === "object" && "data" in value) {
            return Array.isArray(value.data) ? value.data as WorkTypeDto[] : []
        }
        return []
    }, [response])

    const isEditing = drafts.length > 0
    const draftByCode = new Map(drafts.filter((draft) => !draft.isNew).map((draft) => [draft.key, draft]))
    const newDrafts = drafts.filter((draft) => draft.isNew)
    const visibleCodes = workTypes.map((workType) => workType.workType).filter((code): code is string => Boolean(code))
    // Selection can outlive a refetch; only act on rows that are still listed
    const activeSelection = selectedCodes.filter((code) => visibleCodes.includes(code))
    const refresh = () => queryClient.invalidateQueries({ queryKey: getGetWorkTypesQueryKey(estateId) })

    const updateDraft = (key: string, changes: Partial<Draft>) =>
        setDrafts((current) => current.map((draft) => draft.key === key ? { ...draft, ...changes } : draft))

    const addRow = () => {
        const key = `new-${nextNewKey.current++}`
        setDrafts((current) => [{ key, isNew: true, workType: "", weighingRequired: false }, ...current])
    }

    const editSelected = () => {
        const toEdit = workTypes.filter((workType) => workType.workType && activeSelection.includes(workType.workType) && !draftByCode.has(workType.workType))
        setDrafts((current) => [...current, ...toEdit.map(toDraft)])
    }

    const cancel = () => {
        setDrafts([])
        setShowInvalid(false)
    }

    const save = async () => {
        if (drafts.some((draft) => !draft.workType.trim())) {
            setShowInvalid(true)
            return
        }
        setIsSaving(true)
        const failed: Draft[] = []
        for (const draft of drafts) {
            const workType = draft.workType.trim()
            try {
                if (draft.isNew) {
                    await createWorkType({ estateId, data: { workType, weighingRequired: draft.weighingRequired } })
                } else {
                    await updateWorkType({ estateId, workType: draft.key, data: { weighingRequired: draft.weighingRequired } })
                }
            } catch (error) {
                failed.push(draft)
                notifyError(`${workType}: ${errorMessage(error, "Save failed")}`)
            }
        }
        await refresh()
        // Keep only the rows that failed open
        setDrafts(failed)
        setShowInvalid(false)
        setIsSaving(false)
    }

    const deleteSelected = () => {
        deleteWorkTypes(
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
                    value={draft.workType}
                    // The work type code is the key and cannot be changed
                    disabled={!draft.isNew}
                    autoFocus={draft.isNew}
                    maxLength={MAX_WORK_TYPE_LENGTH}
                    placeholder="Work Type *"
                    aria-label="Work Type"
                    aria-invalid={(showInvalid && !draft.workType.trim()) || undefined}
                    onChange={(event) => updateDraft(draft.key, { workType: event.target.value })}
                    onKeyDown={onDraftKeyDown}
                    className="bg-background"
                />
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Switch
                        checked={draft.weighingRequired}
                        autoFocus={!draft.isNew}
                        onCheckedChange={(checked) => updateDraft(draft.key, { weighingRequired: checked })}
                        aria-label="Weighing Required"
                    />
                    <span className="text-sm text-muted-foreground">{draft.weighingRequired ? "Yes" : "No"}</span>
                </div>
            </TableCell>
        </>
    )

    const allSelected = visibleCodes.length > 0 && visibleCodes.every((code) => activeSelection.includes(code))

    return (
        <>
            <div className="flex flex-wrap items-center gap-4">
                <ButtonGroup>
                    <ToolbarButton label="Add work type" onClick={addRow} disabled={isSaving}>
                        <IconPlus />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Edit selected"
                        onClick={editSelected}
                        disabled={isSaving || activeSelection.every((code) => draftByCode.has(code))}
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
                                    Delete {activeSelection.length} work type{activeSelection.length === 1 ? "" : "s"}?
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
                                    aria-label="Select all work types"
                                />
                            </TableHead>
                            <TableHead>Work Type</TableHead>
                            <TableHead className="w-48">Weighing Required</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {newDrafts.map((draft) => (
                            <TableRow key={draft.key} className="bg-muted/50">
                                <TableCell />
                                {renderDraftCells(draft)}
                            </TableRow>
                        ))}
                        {workTypes.map((workType) => {
                            const code = workType.workType ?? ""
                            const draft = draftByCode.get(code)
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
                                            aria-label={`Select ${code || "work type"}`}
                                        />
                                    </TableCell>
                                    {draft ? renderDraftCells(draft) : (
                                        <>
                                            <TableCell>{code || "-"}</TableCell>
                                            <TableCell>
                                                <Badge className={workType.weighingRequired
                                                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                                    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}>
                                                    {workType.weighingRequired ? "YES" : "NO"}
                                                </Badge>
                                            </TableCell>
                                        </>
                                    )}
                                </TableRow>
                            )
                        })}
                        {workTypes.length === 0 && newDrafts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    {isLoading ? "Loading..." : "No work types."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    )
}
