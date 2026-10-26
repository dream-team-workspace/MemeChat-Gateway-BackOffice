import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary text-primary-foreground",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path
          d="M5 17V7l7 6 7-6v10"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
