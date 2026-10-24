import { useLocation } from "react-router-dom"
import { findNavTrail } from "@/components/nav-data"

/**
 * The window's name from the menu, at the top left of a page's main area (not above its filter panel).
 * Renders nothing for pages outside the menu.
 */
export const PageTitle = () => {
    const { pathname } = useLocation()
    const title = findNavTrail(pathname).at(-1)?.title
    if (!title) return null
    return <h1 className="mb-4 px-4 text-2xl font-semibold tracking-tight lg:px-6">{title}</h1>
}
