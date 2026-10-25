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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
    getGetCollectionPointsQueryKey,
    useCreateCollectionPoint,
    useDeleteCollectionPoints,
    useGetCollectionPoints,
    useUpdateCollectionPoint,
} from "@/api/generated/endpoints/collection-point-controller/collection-point-controller"
import type { CollectionPointDto } from "@/api/generated/models"

/** A row being added or edited in place. `key` is the cpCode for existing rows. */
type Draft = {
    key: string
    isNew: boolean
    cpCode: string
    name: string
    description: string
    isDefault: boolean
    /** The row was the default when editing started; a site must keep one, so it cannot be unticked */
    wasDefault: boolean
}

const toDraft = (collectionPoint: CollectionPointDto): Draft => ({
    key: collectionPoint.cpCode ?? "",
    isNew: false,
    cpCode: collectionPoint.cpCode ?? "",
    name: collectionPoint.name ?? "",
    description: collectionPoint.description ?? "",
    isDefault: Boolean(collectionPoint.isDefault),
    wasDefault: Boolean(collectionPoint.isDefault),
})

const ToolbarButton = ({ label, ...props }: { label: string } & React.ComponentProps<typeof Button>) => (
    <Tooltip>
        <TooltipTrigger render={<Button type="button" variant="outline" size="icon" aria-label={label} {...props} />} />
        <TooltipContent>{label}</TooltipContent>
    </Tooltip>
)

export const CollectionPointsTable = ({ estateId }: { estateId: string }) => {
    const queryClient = useQueryClient()
    const [search, setSearch] = React.useState("")
    const [selectedCodes, setSelectedCodes] = React.useState<string[]>([])
    const [drafts, setDrafts] = React.useState<Draft[]>([])
    const [showInvalid, setShowInvalid] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
    const nextNewKey = React.useRef(0)

    const { data: response, isLoading } = useGetCollectionPoints(estateId, { search: search || undefined })
    const { mutateAsync: createCollectionPoint } = useCreateCollectionPoint({ mutation: { meta: { errorToast: false } } })
    const { mutateAsync: updateCollectionPoint } = useUpdateCollectionPoint({ mutation: { meta: { errorToast: false } } })
    const { mutate: deleteCollectionPoints, isPending: isDeleting } = useDeleteCollectionPoints()
    const collectionPoints = React.useMemo<CollectionPointDto[]>(() => {
        const value = response as unknown
        if (Array.isArray(value)) return value as CollectionPointDto[]
        if (value && typeof value === "object" && "data" in value) {
            return Array.isArray(value.data) ? value.data as CollectionPointDto[] : []
        }
        return []
    }, [response])

    const isEditing = drafts.length > 0
    const draftByKey = new Map(drafts.filter((draft) => !draft.isNew).map((draft) => [draft.key, draft]))
    const newDrafts = drafts.filter((draft) => draft.isNew)
    const visibleCodes = collectionPoints.map((point) => point.cpCode).filter((code): code is string => Boolean(code))
    // Selection can outlive a search or refetch; only act on rows that are still listed
    const activeSelection = selectedCodes.filter((code) => visibleCodes.includes(code))
    const refresh = () => queryClient.invalidateQueries({ queryKey: getGetCollectionPointsQueryKey(estateId).slice(0, 1) })

    const updateDraft = (key: string, changes: Partial<Draft>) =>
        setDrafts((current) => current.map((draft) => {
            if (draft.key === key) return { ...draft, ...changes }
            // Only one row can be the default
            return changes.isDefault ? { ...draft, isDefault: false } : draft
        }))

    const addRow = () => {
        const key = `new-${nextNewKey.current++}`
        // The backend makes the first collection point of a site its default
        const isFirst = collectionPoints.length === 0 && !search && newDrafts.length === 0
        setDrafts((current) => [
            { key, isNew: true, cpCode: "", name: "", description: "", isDefault: isFirst, wasDefault: false },
            ...current,
        ])
    }

    const editSelected = () => {
        const toEdit = collectionPoints.filter((point) => point.cpCode && activeSelection.includes(point.cpCode) && !draftByKey.has(point.cpCode))
        setDrafts((current) => [...current, ...toEdit.map(toDraft)])
    }

    const cancel = () => {
        setDrafts([])
        setShowInvalid(false)
    }

    const isInvalid = (draft: Draft, field: "cpCode" | "name") => showInvalid && !draft[field].trim()

    const save = async () => {
        if (drafts.some((draft) => !draft.cpCode.trim() || !draft.name.trim())) {
            setShowInvalid(true)
            return
        }
        setIsSaving(true)
        // Save the new default last so it is the one left standing
        const ordered = [...drafts].sort((a, b) => Number(a.isDefault && !a.wasDefault) - Number(b.isDefault && !b.wasDefault))
        const failed: Draft[] = []
        for (const draft of ordered) {
            const data = { name: draft.name.trim(), description: draft.description.trim() || undefined, isDefault: draft.isDefault }
            try {
                if (draft.isNew) {
                    await createCollectionPoint({ estateId, data: { cpCode: draft.cpCode.trim(), ...data } })
                } else {
                    await updateCollectionPoint({ estateId, cpCode: draft.cpCode, data })
                }
            } catch (error) {
                failed.push(draft)
                notifyError(`${draft.cpCode.trim()}: ${errorMessage(error, "Save failed")}`)
            }
        }
        await refresh()
        // Keep only the rows that failed open, in their original order
        setDrafts(drafts.filter((draft) => failed.includes(draft)))
        setShowInvalid(false)
        setIsSaving(false)
    }

    const deleteSelected = () => {
        deleteCollectionPoints(
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
                    value={draft.cpCode}
                    // The code is the primary key and cannot be changed
                    disabled={!draft.isNew}
                    autoFocus={draft.isNew}
                    placeholder="Code *"
                    aria-label="Code"
                    aria-invalid={isInvalid(draft, "cpCode") || undefined}
                    onChange={(event) => updateDraft(draft.key, { cpCode: event.target.value })}
                    onKeyDown={onDraftKeyDown}
                    className="bg-background"
                />
            </TableCell>
            <TableCell>
                <Input
                    value={draft.name}
                    autoFocus={!draft.isNew}
                    placeholder="Name *"
                    aria-label="Name"
                    aria-invalid={isInvalid(draft, "name") || undefined}
                    onChange={(event) => updateDraft(draft.key, { name: event.target.value })}
                    onKeyDown={onDraftKeyDown}
                    className="bg-background"
                />
            </TableCell>
            <TableCell>
                <Input
                    value={draft.description}
                    placeholder="Description"
                    aria-label="Description"
                    onChange={(event) => updateDraft(draft.key, { description: event.target.value })}
                    onKeyDown={onDraftKeyDown}
                    className="bg-background"
                />
            </TableCell>
            <TableCell>
                <Checkbox
                    checked={draft.isDefault}
                    disabled={draft.wasDefault}
                    onCheckedChange={(checked) => updateDraft(draft.key, { isDefault: Boolean(checked) })}
                    aria-label={`Make ${draft.cpCode || "new collection point"} the default`}
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
                    placeholder="Search collection points"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="max-w-sm"
                    aria-label="Search collection points"
                />
                <ButtonGroup>
                    <ToolbarButton label="Add collection point" onClick={addRow} disabled={isSaving}>
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
                                    Delete {activeSelection.length} collection point{activeSelection.length === 1 ? "" : "s"}?
                                </PopoverTitle>
                                <PopoverDescription>
                                    {activeSelection.join(", ")}. If the default is deleted, the next collection point becomes the default.
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
                                    aria-label="Select all collection points"
                                />
                            </TableHead>
                            <TableHead className="w-48">Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
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
                        {collectionPoints.map((point) => {
                            const code = point.cpCode ?? ""
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
                                            <TableCell>{point.name || "-"}</TableCell>
                                            <TableCell>{point.description || "-"}</TableCell>
                                            <TableCell>
                                                {point.isDefault && (
                                                    <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">DEFAULT</Badge>
                                                )}
                                            </TableCell>
                                        </>
                                    )}
                                </TableRow>
                            )
                        })}
                        {collectionPoints.length === 0 && newDrafts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {isLoading ? "Loading..." : "No collection points."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    )
}
