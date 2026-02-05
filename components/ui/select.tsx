import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = ({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
    "h-10 rounded-lg border border-border bg-white px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
    className
  )}
    {...props}
  />
);
