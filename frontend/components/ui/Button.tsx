import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button = ({ children, className, variant = 'primary', isLoading, ...props }: ButtonProps) => {
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20",
    secondary: "bg-white/10 hover:bg-white/20 text-white",
    danger: "bg-red-500/80 hover:bg-red-500 text-white"
  };

  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : children}
    </button>
  );
};

