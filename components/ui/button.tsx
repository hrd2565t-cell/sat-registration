"use client";

import * as React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "ghost"
    | "outline"
    | "light"
    | "muted";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  isDisabled?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  isDisabled = false,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium rounded transition-colors disabled:pointer-events-none";

  const variants = {
    primary: "bg-[#1e3a8a] text-white hover:bg-[#1e40af] shadow-sm",
    secondary: "bg-[#6b7280] text-white hover:bg-[#4b5563] shadow-sm",
    danger: "bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-sm",
    ghost:
      "bg-transparent text-[#1e3a8a] hover:bg-[#eff6ff] hover:text-[#1e40af]",
    outline:
      "border border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white",
    light:
      "border border-[#7ea6d8] bg-[#eaf2fd] text-[#1e3a8a] hover:bg-[#dbeafe]",
    muted: "bg-[#d1d5db] text-[#4b5563] hover:bg-[#c3c9d1]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isDisabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="-ml-1 mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </button>
  );
}
