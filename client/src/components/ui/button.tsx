import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:from-amber-300 hover:to-amber-500 shadow-lg shadow-amber-500/20",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/5",
      ghost: "hover:bg-white/10 text-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline: "border-2 border-primary/50 text-primary hover:bg-primary/10",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-md",
      md: "h-10 px-4 py-2 rounded-lg",
      lg: "h-12 px-6 text-lg rounded-xl",
      icon: "h-10 w-10 p-2 rounded-lg flex items-center justify-center",
    };

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
