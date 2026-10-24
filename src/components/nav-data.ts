export type NavItem = {
  title: string;
  url?: string; // The route path
  items?: NavItem[]; // Nested sub-items
};

export const navData: NavItem[] = [
  {
    title: "Attendance Management",
    items: [
      { title: "Attendance", url: "/attendance" },
    ],
  },
  {
    title: "Weight Management",
    items: [
      { title: "Weight History", url: "/weight-history" },
      { title: "Pending Approvals", url: "/weight-approvals" },
      { title: "Daily Summary", url: "/daily-weight-summary" },
      // Pickers: granted the /mine endpoints instead of the full ones
      { title: "My Weighings", url: "/my-weighings" },
      { title: "My Daily Summary", url: "/my-daily-summary" },
    ],
  },
  {
    title: "Sites",
    items: [
      { title: "Sites", url: "/sites" },
    ],
  },
  {
    title: "Users and Permissions",
    items: [
      { title: "Users", url: "/users" },
      { title: "Permission Sets", url: "/permission-sets" },
    ],
  },
];

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
