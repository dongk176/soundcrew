import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[120px] w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
