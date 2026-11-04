import type { Permission } from "@/lib/permissions";
import type en from "@/i18n/en.json";

type NavTitleKey = `nav.${keyof typeof en.nav}`;

export type NavItem = {
  titleKey: NavTitleKey; // Shown through t()
  url?: string; // The route path
  // The endpoint the page loads its data from; the page is shown only to users granted it (DB-01)
  permission?: Permission;
  items?: NavItem[]; // Nested sub-items
};

export const navData: NavItem[] = [
  {
    titleKey: "nav.attendanceManagement",
    items: [
      { titleKey: "nav.attendance", url: "/attendance", permission: "GET:/api/attendance" },
    ],
  },
  {
    titleKey: "nav.weightManagement",
    items: [
      { titleKey: "nav.weightHistory", url: "/weight-history", permission: "GET:/api/weights" },
      { titleKey: "nav.pendingApprovals", url: "/weight-approvals", permission: "GET:/api/weight-changes/pending" },
      { titleKey: "nav.dailySummary", url: "/daily-weight-summary", permission: "GET:/api/daily-weight-summary" },
      // Pickers: granted the /mine endpoints instead of the full ones
      { titleKey: "nav.myWeighings", url: "/my-weighings", permission: "GET:/api/weights/mine" },
      { titleKey: "nav.myDailySummary", url: "/my-daily-summary", permission: "GET:/api/daily-weight-summary/mine" },
    ],
  },
  {
    titleKey: "nav.sites",
    items: [
      { titleKey: "nav.sites", url: "/sites", permission: "GET:/api/estates" },
    ],
  },
  {
    titleKey: "nav.usersAndPermissions",
    items: [
      { titleKey: "nav.users", url: "/users", permission: "GET:/api/employees" },
      { titleKey: "nav.permissionSets", url: "/permission-sets", permission: "GET:/api/permissionSet" },
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
