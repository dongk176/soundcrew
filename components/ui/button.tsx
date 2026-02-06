import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const styles = {
  primary: "bg-foreground text-white hover:opacity-90",
  secondary:
    "border border-border text-foreground bg-[#151a22] hover:bg-slate-50",
  ghost: "text-foreground hover:bg-slate-100"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
        styles[variant],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
