import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { PanelLeftIcon } from "lucide-react"
import { Fragment } from "react"
import { Link, useLocation } from "react-router-dom"
import { findNavTrail } from "@/components/nav-data"

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()
  const { pathname } = useLocation()

  // Drop a group crumb that just repeats the page name (e.g. "Sites > Sites")
  const crumbs = findNavTrail(pathname).filter(
    (crumb, index, trail) => index === trail.length - 1 || crumb.title !== trail[index + 1].title
  )

  return (
    <header className="sticky top-0 z-50 flex w-full items-center border-b bg-background">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <PanelLeftIcon
          />
        </Button>
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              {crumbs.length ? (
                <BreadcrumbLink render={<Link to="/landing" />}>Home</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>Home</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {crumbs.map((crumb, index) => (
              <Fragment key={crumb.title}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {index === crumbs.length - 1 ? (
                    <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                  ) : crumb.url ? (
                    <BreadcrumbLink render={<Link to={crumb.url} />}>{crumb.title}</BreadcrumbLink>
                  ) : (
                    <span>{crumb.title}</span>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        {/* <SearchForm className="w-full sm:ml-auto sm:w-auto" /> */}
      </div>
    </header>
  )
}
