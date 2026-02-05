import * as React from "react";
import { cn } from "@/lib/utils";

export const Badge = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "inline-flex items-center rounded-md border border-border bg-white px-2.5 py-1 text-xs text-muted",
      className
    )}
    {...props}
  />
);
