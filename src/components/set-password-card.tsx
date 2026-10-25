import React from "react"
import { IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getGetAllEmployeesQueryKey, useSetPassword } from "@/api/generated/endpoints/employee-controller/employee-controller"
import { getFindAllQueryKey, useCreate as useCreateUser } from "@/api/generated/endpoints/user-controller/user-controller"
import { notifySuccess } from "@/lib/notify"

/**
 * Set a new login password for an employee's user account, or with createAccount give an employee
 * without one a login (username = employee code). Mount it only while it should be shown.
 */
export const SetPasswordCard = ({
    employeeCode,
    createAccount = false,
    onClose,
}: {
    employeeCode: string
    createAccount?: boolean
    onClose: () => void
}) => {
    const queryClient = useQueryClient()
    const [newPassword, setNewPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")
    const [mismatch, setMismatch] = React.useState(false)
    const { mutate: setPassword, isPending: isSettingPassword } = useSetPassword()
    const { mutate: createUser, isPending: isCreatingUser } = useCreateUser()
    const isPending = isSettingPassword || isCreatingUser

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
        if (createAccount) {
            createUser({ data: { employeeCode, password: newPassword } }, {
                onSuccess: () => {
                    // Has User Account and the grant tabs follow the employee list
                    void queryClient.invalidateQueries({ queryKey: getGetAllEmployeesQueryKey().slice(0, 1) })
                    void queryClient.invalidateQueries({ queryKey: getFindAllQueryKey() })
                    notifySuccess(`User account created for ${employeeCode}.`)
                    onClose()
                },
            })
            return
        }
        setPassword({ employeeCode, data: { newPassword } }, {
            onSuccess: () => {
                notifySuccess(`Password updated for ${employeeCode}.`)
                onClose()
            },
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <Card className="relative z-10 w-full max-w-sm shadow-xl">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <CardHeader className="border-b">
                        <CardTitle>{createAccount ? "Create User Account" : "Set New Password"}</CardTitle>
                        <CardDescription>
                            {createAccount
                                ? `For ${employeeCode}, who logs in with the employee code. Grant permission sets and sites afterwards.`
                                : `For ${employeeCode}. They will be signed out of other sessions.`}
                        </CardDescription>
                        <CardAction>
                            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                                <IconX />
                            </Button>
                        </CardAction>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-4">
                        {mismatch && (
                            <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
                                Passwords do not match.
                            </div>
                        )}
                        <div className="flex flex-col gap-4 rounded-xl bg-muted/50 p-4">
                            <Field>
                                <Input
                                    type="password"
                                    placeholder={createAccount ? "Password *" : "New password *"}
                                    aria-label={createAccount ? "Password" : "New password"}
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
                                    placeholder={createAccount ? "Re-type password *" : "Re-type new password *"}
                                    aria-label={createAccount ? "Re-type password" : "Re-type new password"}
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
                            {createAccount
                                ? isPending ? "Creating..." : "Create Account"
                                : isPending ? "Saving..." : "Set Password"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
