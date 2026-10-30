import React from "react"

/**
 * An image from the API (e.g. a face photo), as an object URL. Fetched with the login cookie,
 * because an <img> pointing at another origin may be sent without it.
 * undefined while loading, null when there is none.
 */
export const useApiImage = (path: string) => {
    const [url, setUrl] = React.useState<string | null | undefined>(undefined)
    React.useEffect(() => {
        let objectUrl: string | null = null
        let cancelled = false
        const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "")
        fetch(`${baseUrl}${path}`, { credentials: "include" })
            .then((response) => response.ok ? response.blob() : null)
            .then((blob) => {
                if (cancelled) return
                objectUrl = blob ? URL.createObjectURL(blob) : null
                setUrl(objectUrl)
            })
            .catch(() => !cancelled && setUrl(null))
        return () => {
            cancelled = true
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [path])
    return url
}
