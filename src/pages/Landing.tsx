import logo from "@/assets/logo.png";
import { useAuth } from "@/context/AuthContext";

function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

export default function Landing() {
    const { user } = useAuth();

    return (
        <div className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden bg-linear-to-br from-primary/5 via-background to-primary/10 px-4">
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

            {/* Soft glow behind the logo */}
            <div
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-1/2 size-112 -translate-x-1/2 -translate-y-[70%] rounded-full bg-primary/15 blur-3xl"
            />

            <div className="relative flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <img
                    src={logo}
                    alt="Agrum"
                    className="size-28 object-contain drop-shadow-lg sm:size-32"
                />

                <p className="mt-8 text-lg font-semibold text-muted-foreground sm:text-xl">
                    {greeting()}{user?.username ? `, ${user.username}` : ""}
                </p>

                <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                    Welcome to{" "}
                    <span className="bg-linear-to-r from-lime-600 to-emerald-700 bg-clip-text text-transparent dark:from-lime-400 dark:to-emerald-500">
                        Agrum
                    </span>
                </h1>

                <p className="mt-5 text-sm text-muted-foreground sm:text-base">
                    Admin Panel
                </p>
            </div>
        </div>
    );
}
