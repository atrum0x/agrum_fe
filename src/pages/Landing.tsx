import { Link } from "react-router-dom";
import { IconCalendarCheck, IconHourglass, IconRefresh, IconScale, IconWeight } from "@tabler/icons-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/context/AuthContext";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { filterNav, navData, type NavItem } from "@/components/nav-data";
import { formatKg } from "@/lib/weight-format";
import { useGetDashboard, useGetMyDashboard } from "@/api/generated/endpoints/dashboard-controller/dashboard-controller";
import { useCountPendingWeightChanges } from "@/api/generated/endpoints/weight-approval-controller/weight-approval-controller";
import type { DashboardDto } from "@/api/generated/models";

function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

const flatten = (items: NavItem[]): NavItem[] =>
    items.flatMap((item) => item.items?.length ? flatten(item.items) : item.url ? [item] : []);

function StatCard({ label, value, unit, icon, to }: {
    label: string
    value?: string
    unit?: string
    icon: React.ReactNode
    to?: string
}) {
    const card = (
        <Card size="sm" className={to ? "transition-colors hover:bg-muted/50" : undefined}>
            <CardHeader>
                <CardDescription className="flex items-center gap-2">{icon}{label}</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                    {value ?? "—"}{value != null && unit && <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>}
                </CardTitle>
            </CardHeader>
        </Card>
    );
    return to ? <Link to={to} className="rounded-xl focus-visible:outline-2 focus-visible:outline-ring">{card}</Link> : card;
}

/**
 * Dashboard (FSD 2.2): today's live counts for the sites the user can see, Pending Authorizations
 * for approvers, and a button for each window the user may open. Pickers are granted the /mine
 * counts and see only their own weighings.
 */
export default function Landing() {
    const { user, can } = useAuth();
    const showAll = can("GET:/api/dashboard");
    const showMine = !showAll && can("GET:/api/dashboard/mine");
    const showPending = can("GET:/api/weight-changes/pending/count");
    const all = useGetDashboard({ query: { enabled: showAll } });
    const mine = useGetMyDashboard({ query: { enabled: showMine } });
    const pending = useCountPendingWeightChanges({ query: { enabled: showPending } });
    const dashboard = (showAll ? all.data : mine.data) as DashboardDto | undefined;
    const pendingCount = pending.data as number | undefined;
    const windows = flatten(filterNav(navData, can));
    const isFetching = all.isFetching || mine.isFetching || pending.isFetching;
    const refresh = () => {
        if (showAll) void all.refetch();
        if (showMine) void mine.refetch();
        if (showPending) void pending.refetch();
    };

    return (
        <div className="relative flex h-full min-h-0 flex-col items-center overflow-y-auto bg-linear-to-br from-primary/5 via-background to-primary/10 px-4">
            {/* Decorative sweep, like a large leaf curving across the page */}
            <svg
                aria-hidden
                className="pointer-events-none absolute inset-0 size-full"
                viewBox="0 0 1600 900"
                preserveAspectRatio="none"
            >
                <defs>
                    <linearGradient id="landing-sweep" x1="0" y1="1" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.02" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.18" />
                    </linearGradient>
                </defs>
                <path
                    d="M180 900 C 420 520, 820 220, 1600 60 L 1600 0 L 1520 0 C 1480 380, 1340 640, 1200 900 Z"
                    fill="url(#landing-sweep)"
                />
                <path
                    d="M0 900 C 300 600, 700 330, 1600 160"
                    fill="none"
                    stroke="var(--primary)"
                    strokeOpacity="0.08"
                    strokeWidth="2"
                />
            </svg>

            <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4">
                    <img src={logo} alt="Agrum" className="size-14 object-contain drop-shadow-lg" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-muted-foreground">
                            {greeting()}{user?.employeeName || user?.username ? `, ${user.employeeName || user.username}` : ""}
                        </p>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            Welcome to{" "}
                            <span className="bg-linear-to-r from-lime-600 to-emerald-700 bg-clip-text text-transparent dark:from-lime-400 dark:to-emerald-500">
                                Agrum
                            </span>
                        </h1>
                    </div>
                    {(showAll || showMine || showPending) && (
                        <Button variant="outline" onClick={refresh} disabled={isFetching}>
                            <IconRefresh className={isFetching ? "animate-spin" : undefined} />
                            Refresh
                        </Button>
                    )}
                </div>

                {(showAll || showMine || showPending) && (
                    <section aria-label="Today" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {showAll && (
                            <StatCard label="Attendance Today" icon={<IconCalendarCheck className="size-4" />}
                                      value={dashboard?.attendanceToday?.toString()} />
                        )}
                        {(showAll || showMine) && (
                            <>
                                <StatCard label={showMine ? "My Weighings Today" : "Weighings Today"} icon={<IconScale className="size-4" />}
                                          value={dashboard?.weighingsToday?.toString()} />
                                <StatCard label={showMine ? "My Total Today" : "Total Weight Today"} icon={<IconWeight className="size-4" />}
                                          value={dashboard ? formatKg(dashboard.totalWeightTodayKg) : undefined} unit="kg" />
                            </>
                        )}
                        {showPending && (
                            <StatCard label="Pending Authorizations" icon={<IconHourglass className="size-4" />}
                                      value={pendingCount?.toString()}
                                      to={can("GET:/api/weight-changes/pending") ? "/weight-approvals" : undefined} />
                        )}
                    </section>
                )}

                {windows.length > 0 ? (
                    <section aria-label="Windows" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {windows.map((item) => (
                            <Link key={item.url} to={item.url!}
                                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-14 justify-start bg-background/70 text-base")}>
                                {item.title}
                            </Link>
                        ))}
                    </section>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        You do not have access to any window. Please contact the administrator.
                    </p>
                )}
            </div>
        </div>
    );
}
