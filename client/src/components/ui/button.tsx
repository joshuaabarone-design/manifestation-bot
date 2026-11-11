import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg" | "icon" | "default";
  isLoading?: boolean;
}

const VARIANT_CLASSES = {
  primary: "bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:from-amber-300 hover:to-amber-500 shadow-lg shadow-amber-500/20",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/5",
  ghost: "hover:bg-white/10 text-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "border-2 border-primary/50 text-primary hover:bg-primary/10",
} as const;

const SIZE_CLASSES = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-10 px-4 py-2 rounded-lg",
  default: "h-10 px-4 py-2 rounded-lg",
  lg: "h-12 px-6 text-lg rounded-xl",
  icon: "h-10 w-10 p-2 rounded-lg flex items-center justify-center",
} as const;

/** shadcn-compatible class helper used by alert-dialog, calendar and pagination. */
export function buttonVariants(opts: { variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; className?: string } = {}) {
  return cn(
    "font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2",
    VARIANT_CLASSES[opts.variant ?? "primary"],
    SIZE_CLASSES[opts.size ?? "md"],
    opts.className,
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = VARIANT_CLASSES;
    const sizes = SIZE_CLASSES;

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
