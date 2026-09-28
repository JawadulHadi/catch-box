import { cn } from "@/lib/utils";

/** The Catchbox mark: an open box catching a falling piece. */
export function CatchboxMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("text-primary", className)}
    >
      <path
        d="M4 14v11a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M4 14h7l2 4h6l2-4h7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 3v7m0 0 3-3m-3 3-3-3"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
    </svg>
  );
}
