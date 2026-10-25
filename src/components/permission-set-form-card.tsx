import React from "react"
import { IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    getGetAllPermissionSetsQueryKey,
    useCreatePermissionSet,
    useUpdatePermissionSet,
} from "@/api/generated/endpoints/permission-controller/permission-controller"
import type { PermissionSetDto } from "@/api/generated/models"

/** Create a permission set, or edit `permissionSet`'s description when one is given. Mount it only while it should be shown. */
export const PermissionSetFormCard = ({
    permissionSet,
    onClose,
    onSaved,
}: {
    permissionSet?: PermissionSetDto
    onClose: () => void
    onSaved?: (permissionSetId: string) => void
}) => {
    const isEdit = Boolean(permissionSet)
    const queryClient = useQueryClient()
    const [permissionSetId, setPermissionSetId] = React.useState(permissionSet?.permissionSetId ?? "")
    const [description, setDescription] = React.useState(permissionSet?.description ?? "")
    const { mutate: createPermissionSet, isPending: isCreating } = useCreatePermissionSet()
    const { mutate: updatePermissionSet, isPending: isUpdating } = useUpdatePermissionSet()
    const isPending = isCreating || isUpdating

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [onClose])

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        const id = permissionSetId.trim()
        const onSuccess = () => {
            void queryClient.invalidateQueries({ queryKey: getGetAllPermissionSetsQueryKey().slice(0, 1) })
            onSaved?.(id)
            onClose()
        }

        if (isEdit) {
            updatePermissionSet({ permissionSetId: id, data: { description: description || undefined } }, { onSuccess })
            return
        }
        createPermissionSet({ data: { permissionSetId: id, description: description || undefined } }, { onSuccess })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <Card className="relative z-10 w-full max-w-md shadow-xl">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <CardHeader className="border-b">
                        <CardTitle>{isEdit ? "Edit Permission Set" : "New Permission Set"}</CardTitle>
                        <CardDescription>
                            {isEdit
                                ? `Update the description of ${permissionSet?.permissionSetId}.`
                                : "Create a permission set, then grant it projections and users."}
                        </CardDescription>
                        <CardAction>
                            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                                <IconX />
                            </Button>
                        </CardAction>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-col gap-4 rounded-xl bg-muted/50 p-4">
                            <Field>
                                <FieldLabel htmlFor="permission-set-form-id" className="text-muted-foreground">
                                    Permission Set *
                                </FieldLabel>
                                <Input
                                    id="permission-set-form-id"
                                    placeholder="e.g. HR_ADMIN"
                                    required
                                    autoFocus={!isEdit}
                                    // The ID is the primary key and cannot be changed
                                    disabled={isEdit}
                                    value={permissionSetId}
                                    onChange={(event) => setPermissionSetId(event.target.value)}
                                    className="bg-background"
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="permission-set-form-description" className="text-muted-foreground">
                                    Description
                                </FieldLabel>
                                <Input
                                    id="permission-set-form-description"
                                    autoFocus={isEdit}
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    className="bg-background"
                                />
                            </Field>
                        </div>
                    </CardContent>

                    <CardFooter className="justify-end gap-2 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isPending}>
                            {isEdit
                                ? isPending ? "Saving..." : "Save Changes"
                                : isPending ? "Creating..." : "Create Permission Set"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
