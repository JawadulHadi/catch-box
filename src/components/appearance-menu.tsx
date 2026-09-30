import { SwatchBook } from "lucide-react";

import { Button } from "@/design-system/catchbox/components/button";
import { ThemePicker } from "@/design-system/catchbox/components/theme-picker";
import { cn } from "@/design-system/catchbox/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type AppearanceMenuProps = {
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

export function AppearanceMenu({
  className,
  side = "bottom",
  align = "start",
}: AppearanceMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={className}>
          <SwatchBook className="size-4" />
          Appearance
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        collisionPadding={16}
        className={cn(
          "glass w-80 overflow-y-auto rounded-xl p-4",
          "max-h-(--radix-popover-content-available-height)",
        )}
      >
        <p className="font-display text-sm font-semibold">Appearance</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Start from a featured theme or mix your own. Saved on this device.
        </p>
        <ThemePicker className="mt-4" />
      </PopoverContent>
    </Popover>
  );
}
