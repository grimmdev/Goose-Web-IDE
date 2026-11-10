import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "run" | "stop";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer border";

    const variants = {
      default:
        "bg-black text-white border-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:border-white dark:hover:bg-neutral-200",
      secondary:
        "bg-neutral-100 text-black border-neutral-200 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-white dark:border-neutral-800 dark:hover:bg-neutral-800",
      outline:
        "bg-transparent text-black border-neutral-300 hover:bg-neutral-100 dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-900",
      ghost:
        "bg-transparent text-black border-transparent hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-900",
      destructive: "bg-red-600 text-white border-red-600 hover:bg-red-700",
      run: "honk-run-button text-black shadow-md",
      stop: "honk-stop-button text-white shadow-md",
    };

    const sizes = {
      default: "h-10 px-4 py-2 text-sm rounded-md",
      sm: "h-8 px-3 text-xs rounded",
      lg: "h-12 px-6 text-base rounded-lg",
      icon: "h-9 w-9 p-0 rounded-md",
    };

    return (
      <button
        ref={ref}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        <span className="relative z-10 inline-flex items-center justify-center space-x-1.5">
          {children}
        </span>
      </button>
    );
  }
);
Button.displayName = "Button";
