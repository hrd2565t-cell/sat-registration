import * as React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  radius?: "md" | "lg";
}

export function Card({
  className,
  padding = "md",
  radius = "lg",
  children,
  ...props
}: CardProps) {
  const paddings = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const radii = {
    md: "rounded-lg",
    lg: "rounded-xl",
  };

  return (
    <div
      className={`bg-white border border-[#e5e7eb] shadow-sm ${radii[radius]} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex flex-col space-y-1.5 pb-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-xl font-semibold text-[#111827] tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-0 py-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center space-x-2 pt-6 ${className}`} {...props}>
      {children}
    </div>
  );
}
