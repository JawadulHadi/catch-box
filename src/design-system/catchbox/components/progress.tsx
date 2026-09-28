"use client";

import * as React from "react";

import { cn } from "../lib/utils";

export type ProgressProps = React.ComponentPropsWithoutRef<"progress">;

const Progress = React.forwardRef<HTMLProgressElement, ProgressProps>(
  ({ className, value, max = 100, ...props }, ref) => (
    <progress
      ref={ref}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-primary/20 accent-primary [&::-webkit-progress-bar]:bg-primary/20 [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary",
        className,
      )}
      value={value}
      max={max}
      {...props}
    />
  ),
);
Progress.displayName = "Progress";

export { Progress };
