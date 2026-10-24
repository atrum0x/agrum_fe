// Grants come from /api/auth/me/web as projection ids like "GET:/api/weights/{weightId}/history".
// The UI uses them only to hide what the user cannot use; the backend still checks every call.

export type Permission = `${"GET" | "POST" | "PUT" | "PATCH" | "DELETE"}:/${string}`

export type PermissionProfile = {
    superuser?: boolean
    permissions?: string[]
}

const escapeRegExp = (value: string) => value.replace(/[.+?^$()|[\]\\]/g, "\\$&")

// Spring path patterns: {var} is one segment, ** is any number of segments
function patternToRegExp(path: string) {
    const source = path
        .split("/")
        .map((segment) => {
            if (segment === "**") return ".*"
            return escapeRegExp(segment).replace(/\{[^}]+\}/g, "[^/]+").replace(/\*/g, "[^/]*")
        })
        .join("/")
    return new RegExp(`^${source}$`)
}

/**
 * Whether the profile grants the endpoint. `required` is written the way the projection id is,
 * so "GET:/api/weights/{weightId}/history" matches that grant exactly and a concrete path such as
 * "GET:/api/weights/abc/history" matches it as a pattern.
 */
export function hasPermission(profile: PermissionProfile | undefined, required: Permission): boolean {
    if (!profile) return false
    if (profile.superuser) return true
    const [method, path] = splitPermission(required)
    return (profile.permissions ?? []).some((grant) => {
        if (grant === required) return true
        const [grantMethod, grantPath] = splitPermission(grant)
        return grantMethod === method && patternToRegExp(grantPath).test(path)
    })
}

function splitPermission(permission: string): [string, string] {
    const index = permission.indexOf(":")
    return [permission.slice(0, index), permission.slice(index + 1)]
}
