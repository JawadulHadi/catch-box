import { Badge } from "@/design-system/catchbox/components/badge";
import { reasonLabels, type CatchReason } from "@/lib/catchbox-service";
import { cn } from "@/lib/utils";

const toneClasses: Record<CatchReason, string> = {
  page_changed: "border-warning/40 bg-warning/10 text-warning",
  blocked: "border-destructive/40 bg-destructive/10 text-destructive",
  missing_info: "border-primary/40 bg-primary/10 text-primary",
  other: "border-border bg-muted text-muted-foreground",
};

export function ReasonBadge({ reason, className }: { reason: CatchReason; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-normal", toneClasses[reason], className)}>
      {reasonLabels[reason]}
    </Badge>
  );
}
