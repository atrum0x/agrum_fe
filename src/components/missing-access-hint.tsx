import { Trans } from "react-i18next"
import { FieldDescription } from "@/components/ui/field"
import { useAuth } from "@/context/AuthContext"
import type { Permission } from "@/lib/permissions"

/**
 * Says when part of a page is off because the user lacks a grant, and names the projection so they can
 * ask the administrator for it. Use it where a helper silently disappears (suggestions, totals), not for
 * action buttons the user isn't meant to have: those stay hidden.
 * Renders nothing when the user has the grant.
 */
export const MissingAccessHint = ({ grant, feature }: {
    /** Projection id, e.g. "GET:/api/weights/filter-options/workers" */
    grant: Permission
    /** What is off, e.g. "Suggestions" */
    feature: string
}) => {
    const { can } = useAuth()
    if (can(grant)) return null
    return (
        <FieldDescription className="text-xs">
            <Trans
                i18nKey="common.missingAccess"
                values={{ feature, grant }}
                components={{ code: <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.7rem] break-all select-all" /> }}
            />
        </FieldDescription>
    )
}
