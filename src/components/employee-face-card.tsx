import React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { IconFaceId, IconPhotoOff, IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useAuth } from "@/context/AuthContext"
import { useApiImage } from "@/api/api-image"
import {
    getGetRegistrationQueryKey,
    useGetRegistration,
    useRemoveTemplate,
} from "@/api/generated/endpoints/face-template-controller/face-template-controller"
import type { FaceRegistrationDto } from "@/api/generated/models"
import { notifyError, notifySuccess } from "@/lib/notify"
import { formatDateTime, unwrap } from "@/lib/weight-format"

// Label above value, like the employee details beside the card
const Detail = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="truncate">{children}</p>
    </div>
)

// A worker without a registered face answers 404
const isNotFound = (error: unknown) => error instanceof Error && error.message.includes("(404)")

const FacePhoto = ({ registration }: { registration: FaceRegistrationDto }) => {
    // The registration time in the path loads the new photo after the worker is registered again
    const url = useApiImage(
        `/api/face-templates/${encodeURIComponent(registration.employeeCode ?? "")}/photo?v=${registration.registeredAt ?? ""}`,
    )
    if (url === undefined) return <span className="text-sm text-muted-foreground">Loading…</span>
    if (url === null) {
        return (
            <span className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                <IconPhotoOff />
                No photo
            </span>
        )
    }
    return <img src={url} alt={`Registered face of ${registration.employeeCode}`} className="size-full object-cover" />
}

/**
 * The employee's registered face for weighing: the photo, when and by whom it was registered, and
 * Remove Face. Faces are registered on the phone (More → Face Registration).
 */
export const EmployeeFaceCard = ({ employeeCode }: { employeeCode?: string }) => {
    const { can } = useAuth()
    const queryClient = useQueryClient()
    const [isRemoveOpen, setIsRemoveOpen] = React.useState(false)
    const { data, error, isLoading } = useGetRegistration(employeeCode ?? "", {
        query: {
            enabled: Boolean(employeeCode),
            retry: (count, e) => !isNotFound(e) && count < 2,
            // The card shows "No face registered" or the error itself, so no error toast as well
            meta: { errorToast: false },
        },
    })
    const registration = unwrap<FaceRegistrationDto>(data)
    const { mutate: removeFace, isPending: isRemoving } = useRemoveTemplate({
        mutation: {
            onSuccess: () => {
                setIsRemoveOpen(false)
                notifySuccess(`Face removed for ${employeeCode}. Phones drop it at their next refresh.`)
                void queryClient.invalidateQueries({ queryKey: getGetRegistrationQueryKey(employeeCode ?? "") })
            },
            onError: (e) => notifyError(e instanceof Error ? e.message : "The face could not be removed."),
        },
    })
    const hasFace = Boolean(registration) && !error

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Registered Face</CardTitle>
                <CardDescription>Identifies the worker at the scale</CardDescription>
                {hasFace && can("DELETE:/api/face-templates/{employeeCode}") && (
                    <CardAction>
                        <Popover open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
                            <PopoverTrigger
                                render={<Button type="button" variant="outline" size="sm" aria-label="Remove face" />}
                            >
                                <IconTrash />
                                Remove Face
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72">
                                <PopoverHeader>
                                    <PopoverTitle>Remove the registered face?</PopoverTitle>
                                    <PopoverDescription>
                                        {employeeCode} is picked by search at the scale until their face is registered again.
                                    </PopoverDescription>
                                </PopoverHeader>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => setIsRemoveOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        disabled={isRemoving || !employeeCode}
                                        onClick={() => employeeCode && removeFace({ employeeCode })}
                                    >
                                        {isRemoving ? "Removing..." : "Remove"}
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </CardAction>
                )}
            </CardHeader>
            {/* Photo beside the details, so the card is no taller than the employee details next to it */}
            <CardContent className="flex items-start gap-4">
                <div className="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                    {employeeCode && isLoading ? (
                        <span className="text-sm text-muted-foreground">Loading…</span>
                    ) : hasFace && registration && can("GET:/api/face-templates/{employeeCode}/photo") ? (
                        <FacePhoto registration={registration} />
                    ) : (
                        <IconFaceId className="size-12 text-muted-foreground" />
                    )}
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    {hasFace && registration ? (
                        <>
                            <Detail label="Registered">{formatDateTime(registration.registeredAt)}</Detail>
                            <Detail label="By">{registration.registeredBy || "—"}</Detail>
                            <Detail label="Poses">{registration.sampleCount}</Detail>
                        </>
                    ) : !employeeCode || isLoading ? null : (
                        <p className="text-sm text-muted-foreground">
                            {error && !isNotFound(error)
                                ? (error instanceof Error ? error.message : "The face could not be loaded.")
                                : "No face registered. Register it on the phone: More → Face Registration."}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
