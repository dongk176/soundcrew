import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-card border border-border bg-surface shadow-subtle",
      className
    )}
    {...props}
  />
);
