import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
  size?: "default" | "icon";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-lg text-sm font-medium border transition focus:outline-none focus:ring-2 focus:ring-offset-2";
    const variantClass =
      variant === "outline"
        ? "bg-white border-gray-300 text-gray-900 hover:bg-gray-50 focus:ring-gray-200"
        : "bg-indigo-600 border-transparent text-white hover:bg-indigo-700 focus:ring-indigo-300";
    const sizeClass = size === "icon" ? "h-10 w-10 p-0" : "h-10 px-4 py-2";

    return (
      <button
        ref={ref}
        className={`${base} ${variantClass} ${sizeClass} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
export default Button;
