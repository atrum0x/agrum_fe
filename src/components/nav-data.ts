import type { Permission } from "@/lib/permissions";

export type NavItem = {
  title: string;
  url?: string; // The route path
  // The endpoint the page loads its data from; the page is shown only to users granted it (DB-01)
  permission?: Permission;
  items?: NavItem[]; // Nested sub-items
};

export const navData: NavItem[] = [
  {
    title: "Attendance Management",
    items: [
      { title: "Attendance", url: "/attendance", permission: "GET:/api/attendance" },
    ],
  },
  {
    title: "Weight Management",
    items: [
      { title: "Weight History", url: "/weight-history", permission: "GET:/api/weights" },
      { title: "Pending Approvals", url: "/weight-approvals", permission: "GET:/api/weight-changes/pending" },
      { title: "Daily Summary", url: "/daily-weight-summary", permission: "GET:/api/daily-weight-summary" },
      // Pickers: granted the /mine endpoints instead of the full ones
      { title: "My Weighings", url: "/my-weighings", permission: "GET:/api/weights/mine" },
      { title: "My Daily Summary", url: "/my-daily-summary", permission: "GET:/api/daily-weight-summary/mine" },
    ],
  },
  {
    title: "Sites",
    items: [
      { title: "Sites", url: "/sites", permission: "GET:/api/estates" },
    ],
  },
  {
    title: "Users and Permissions",
    items: [
      { title: "Users", url: "/users", permission: "GET:/api/employees" },
      { title: "Permission Sets", url: "/permission-sets", permission: "GET:/api/permissionSet" },
    ],
  },
];

// The menu without the pages the user may not open; groups left empty are dropped
export function filterNav(items: NavItem[], can: (permission: Permission) => boolean): NavItem[] {
  return items.flatMap((item) => {
    if (item.items?.length) {
      const children = filterNav(item.items, can);
      return children.length ? [{ ...item, items: children }] : [];
    }
    return !item.permission || can(item.permission) ? [item] : [];
  });
}

// The permission needed to open the page at this path, if it is a menu page
export function permissionFor(pathname: string): Permission | undefined {
  return findNavTrail(pathname).at(-1)?.permission;
}

// Returns the chain of nav items leading to the given path, e.g. [group, page].
export function findNavTrail(pathname: string, items: NavItem[] = navData): NavItem[] {
  for (const item of items) {
    if (item.url === pathname) return [item];
    if (item.items?.length) {
      const trail = findNavTrail(pathname, item.items);
      if (trail.length) return [item, ...trail];
    }
  }
  return [];
}
