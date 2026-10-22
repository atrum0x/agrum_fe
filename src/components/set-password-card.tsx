import React from "react"
import { IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useSetPassword } from "@/api/generated/endpoints/employee-controller/employee-controller"

/** Set a new login password for an employee's user account. Mount it only while it should be shown. */
export const SetPasswordCard = ({
    employeeCode,
    onClose,
}: {
    employeeCode: string
    onClose: () => void
}) => {
    const [newPassword, setNewPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")
    const [mismatch, setMismatch] = React.useState(false)
    const { mutate: setPassword, isPending, error } = useSetPassword()

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [onClose])

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        if (newPassword !== confirmPassword) {
            setMismatch(true)
            return
        }
        setPassword({ employeeCode, data: { newPassword } }, { onSuccess: onClose })
    }

    const message = mismatch ? "Passwords do not match." : error instanceof Error ? error.message : null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <Card className="relative z-10 w-full max-w-sm shadow-xl">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <CardHeader className="border-b">
                        <CardTitle>Set New Password</CardTitle>
                        <CardDescription>
                            For {employeeCode}. They will be signed out of other sessions.
                        </CardDescription>
                        <CardAction>
                            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                                <IconX />
                            </Button>
                        </CardAction>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-4">
                        {message && (
                            <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
                                {message}
                            </div>
                        )}
                        <div className="flex flex-col gap-4 rounded-xl bg-muted/50 p-4">
                            <Field>
                                <Input
                                    type="password"
                                    placeholder="New password *"
                                    aria-label="New password"
                                    required
                                    autoFocus
                                    autoComplete="new-password"
                                    value={newPassword}
                                    onChange={(event) => {
                                        setNewPassword(event.target.value)
                                        setMismatch(false)
                                    }}
                                    className="bg-background"
                                />
                            </Field>
                            <Field data-invalid={mismatch}>
                                <Input
                                    type="password"
                                    placeholder="Re-type new password *"
                                    aria-label="Re-type new password"
                                    aria-invalid={mismatch}
                                    required
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(event) => {
                                        setConfirmPassword(event.target.value)
                                        setMismatch(false)
                                    }}
                                    className="bg-background"
                                />
                            </Field>
                        </div>
                    </CardContent>

                    <CardFooter className="justify-end gap-2 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Saving..." : "Set Password"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
