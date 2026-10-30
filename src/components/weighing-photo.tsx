import React from "react"
import { IconCamera, IconPhotoOff } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/context/AuthContext"
import { useApiImage } from "@/api/api-image"
import type { WeightHistoryRowDto } from "@/api/generated/models"
import { formatDateTime } from "@/lib/weight-format"

const percent = (similarity?: number) => similarity == null ? "" : ` ${Math.round(similarity * 100)}%`

const Photo = ({ path, label }: { path: string; label: string }) => {
    const url = useApiImage(path)
    return (
        <figure className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {url === undefined && <span className="text-sm text-muted-foreground">Loading…</span>}
                {url === null && (
                    <span className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                        <IconPhotoOff />
                        No photo
                    </span>
                )}
                {url && <img src={url} alt={label} className="size-full object-cover" />}
            </div>
            <figcaption className="text-center text-sm text-muted-foreground">{label}</figcaption>
        </figure>
    )
}

/** The face recognised at the scale, next to the worker's registered face, to check who was weighed. */
const WeighingPhotoDialog = ({ row, onClose }: { row: WeightHistoryRowDto; onClose: () => void }) => {
    const { can } = useAuth()
    const canSeeRegistered = can("GET:/api/face-templates/{employeeCode}/photo")
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{row.employeeCode} · {row.employeeName}</DialogTitle>
                    <DialogDescription>
                        Weighed {formatDateTime(row.weighedAt)} · identified by face{percent(row.faceSimilarity)}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex gap-3">
                    <Photo path={`/api/weights/${row.weightId}/photo`} label="At the scale" />
                    {canSeeRegistered && (
                        <Photo
                            path={`/api/face-templates/${encodeURIComponent(row.employeeCode ?? "")}/photo`}
                            label="Registered face (current)"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

/** Weight History "Identified By": Face with the match score and a photo button, or Search. */
export const IdentifiedByCell = ({ row }: { row: WeightHistoryRowDto }) => {
    const { can } = useAuth()
    const [open, setOpen] = React.useState(false)
    if (row.identifiedBy === "SEARCH") return <>Search</>
    if (row.identifiedBy !== "FACE") return <span className="text-muted-foreground">—</span>
    return (
        // Clicks here (and in the dialog, which React bubbles through the portal) don't select the row
        <span className="inline-flex items-center gap-1 whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
            Face{percent(row.faceSimilarity)}
            {can("GET:/api/weights/{weightId}/photo") && (
                <Button variant="ghost" size="icon-sm" aria-label="View photo" title="View photo" onClick={() => setOpen(true)}>
                    <IconCamera />
                </Button>
            )}
            {open && <WeighingPhotoDialog row={row} onClose={() => setOpen(false)} />}
        </span>
    )
}
