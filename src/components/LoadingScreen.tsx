import { lazy, Suspense, useState } from "react";

// The animation (lottie-web + ~900 KB of JSON) is split into its own chunk
// so it doesn't weigh down the main bundle.
const LogoAnimation = lazy(() => import("./LogoAnimation"));

const MESSAGES = [
  "Brewing a fresh cup for you...",
  "Plucking two leaves and a bud...",
  "Letting the leaves steep...",
  "Walking the estate rows...",
  "Weighing today's harvest...",
  "Warming the teapot...",
  "Rolling and withering the leaves...",
  "Counting the pluckers in the field...",
  "Catching the morning mist on the hills...",
  "Sorting the finest leaves...",
  "Filling the baskets...",
  "Pouring you a cup of Ceylon...",
];

export default function LoadingScreen() {
  const [message] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
      <Suspense fallback={<div className="size-40" />}>
        <LogoAnimation className="size-40" />
      </Suspense>
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}
