import * as React from "react";
import { cn } from "@/lib/utils";

export const Chip = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "inline-flex items-center gap-2 rounded-md border border-border bg-[#151a22] px-3 py-1 text-xs text-foreground",
      className
    )}
    {...props}
  />
);
