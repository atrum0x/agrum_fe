/**
 * Downloads a file (e.g. an Excel export) from the API.
 * The generated hooks can't be used: customFetch reads non-JSON bodies as text, which corrupts binary files.
 * Throws Error(message) from the backend's error JSON, like customFetch.
 */
export const downloadFile = async (path: string, params: Record<string, string | undefined>) => {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "")
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value) query.append(key, value)
    })
    const url = `${baseUrl}${path}${query.size ? `?${query}` : ""}`

    const response = await fetch(url, { credentials: "include" })
    if (!response.ok) {
        let message = `API Error (${response.status})`
        try {
            const error = await response.json()
            if (error?.message) message = error.message
        } catch {
            // not JSON
        }
        throw new Error(message)
    }

    const disposition = response.headers.get("content-disposition") ?? ""
    const fileName = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? "export.xlsx"
    const blob = await response.blob()
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
}
