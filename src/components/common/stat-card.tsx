import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "default" | "info" | "success" | "warning";

const toneClasses: Record<Tone, string> = {
  default: "bg-accent text-accent-foreground",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning-foreground",
};

type StatCardProps = {
  label: string;
  value: string;
  caption?: string;
  icon: LucideIcon;
  tone?: Tone;
};

export function StatCard({ label, value, caption, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {value}
          </p>
          {caption ? (
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{caption}</p>
          ) : null}
        </div>
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-lg", toneClasses[tone])}>
          <Icon className="size-4" />
        </div>
      </div>
    </Card>
  );
}
