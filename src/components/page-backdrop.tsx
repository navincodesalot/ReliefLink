import { cn } from "@/lib/utils";

/**
 * App-wide page wrapper. Provides the shared gradient + accent glow used on
 * every top-level route so the light/dark palette stays consistent.
 */
export function PageBackdrop({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relieflink-page-backdrop", className)}>{children}</div>
  );
}
