import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "h-10 w-full rounded-lg border border-border bg-white px-4 text-sm text-foreground shadow-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
      className
    )}
    {...props}
  />
));

Input.displayName = "Input";
