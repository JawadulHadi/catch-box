import * as React from "react";
import { cn } from "../lib/utils";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("animate-pulse rounded-md bg-primary/10 motion-reduce:animate-none", className)}
    {...props}
  />
));
Skeleton.displayName = "Skeleton";

export { Skeleton };
