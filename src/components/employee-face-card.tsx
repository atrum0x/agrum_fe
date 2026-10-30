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
            <span className="flex flex-col items-center gap-1 px-4 text-center text-sm text-muted-foreground">
                <IconPhotoOff />
                No photo. Registered before photos were kept; register again on the phone to add one.
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
        query: { enabled: Boolean(employeeCode), retry: (count, e) => !isNotFound(e) && count < 2 },
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
            <CardContent className="flex flex-col gap-3">
                <div className="flex aspect-square w-full max-w-64 items-center justify-center self-center overflow-hidden rounded-lg border bg-muted">
                    {!employeeCode || isLoading ? (
                        <span className="text-sm text-muted-foreground">{employeeCode ? "Loading…" : "Select an employee"}</span>
                    ) : hasFace && registration ? (
                        can("GET:/api/face-templates/{employeeCode}/photo")
                            ? <FacePhoto registration={registration} />
                            : <IconFaceId className="size-16 text-muted-foreground" />
                    ) : (
                        <span className="flex flex-col items-center gap-2 px-4 text-center text-sm text-muted-foreground">
                            <IconFaceId className="size-12" />
                            {error && !isNotFound(error)
                                ? (error instanceof Error ? error.message : "The face could not be loaded.")
                                : "No face registered. Register it on the phone: More → Face Registration."}
                        </span>
                    )}
                </div>
                {hasFace && registration && (
                    <p className="text-center text-sm text-muted-foreground">
                        Registered {formatDateTime(registration.registeredAt)} by {registration.registeredBy || "—"}
                        {" · "}{registration.sampleCount} poses
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
