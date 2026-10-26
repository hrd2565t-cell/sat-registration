import * as React from "react";

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SectionCard({ className, children, ...props }: SectionCardProps) {
  return (
    <div
      className={`bg-[#dbeafe] border border-[#bfdbfe] rounded-lg p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
