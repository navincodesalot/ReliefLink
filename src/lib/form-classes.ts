import { cn } from "@/lib/utils";

/** Matches Input styling; use for native `<select>` so dark mode matches the rest of the UI. */
export function nativeSelectClassName(className?: string) {
  return cn(
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "dark:bg-input/30",
    className,
  );
}
