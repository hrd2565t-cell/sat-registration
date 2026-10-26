import * as React from "react";

interface FormFieldProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  helperText,
  error,
  required = false,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-[#374151]">
          {label}{required && <span className="text-[#dc2626] ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-[#dc2626]">{error}</p>}
      {helperText && !error && <p className="text-xs text-[#6b7280]">{helperText}</p>}
    </div>
  );
}
