import * as React from "react";

interface BreadcrumbStep {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  steps: BreadcrumbStep[];
  currentStep: number;
  completedSteps?: number[];
  variant?: "default" | "check";
}

function CheckBadge({ className }: { className?: string }) {
  return (
    <svg
      className={`h-[14px] w-[14px] shrink-0 ${className ?? ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StepArrow({ className }: { className?: string }) {
  return (
    <svg
      className={`h-2.5 w-3 shrink-0 ${className ?? ""}`}
      viewBox="0 0 16 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M1 6h12M9.5 2.5L13 6l-3.5 3.5"
      />
    </svg>
  );
}

export function Breadcrumb({
  steps,
  currentStep,
  completedSteps = [],
  variant = "default",
}: BreadcrumbProps) {
  if (variant === "check") {
    return (
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-[#4b5563]">
        {steps.map((step, index) => {
          const isActive = index + 1 === currentStep;
          const isCompleted = completedSteps.includes(index + 1);
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={index}>
              {isActive ? (
                <span className="flex items-center gap-1 whitespace-nowrap font-semibold text-[#16265E]">
                  <CheckBadge className="text-[#16265E]" />
                  {step.label}
                </span>
              ) : step.href ? (
                <a
                  href={step.href}
                  className="flex items-center gap-1 whitespace-nowrap transition-colors hover:text-[#1e3a8a]"
                >
                  {step.label}
                  {isCompleted && <CheckBadge className="text-[#2f9e57]" />}
                </a>
              ) : (
                <span className="flex items-center gap-1 whitespace-nowrap">
                  {step.label}
                  {isCompleted && <CheckBadge className="text-[#2f9e57]" />}
                </span>
              )}
              {!isLast && (
                <StepArrow
                  className={
                    isCompleted ? "text-[#2f9e57]" : "text-[#b9c0ca]"
                  }
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[12px] text-[#6b7280]">
      {steps.map((step, index) => {
        const isActive = index + 1 === currentStep;
        const isLast = index === steps.length - 1;
        return (
          <React.Fragment key={index}>
            {step.href && !isActive ? (
              <a
                href={step.href}
                className="whitespace-nowrap transition-colors hover:text-[#1e3a8a]"
              >
                {step.label}
              </a>
            ) : (
              <span
                className={
                  isActive
                    ? "whitespace-nowrap font-semibold text-[#16265E]"
                    : "whitespace-nowrap"
                }
              >
                {step.label}
              </span>
            )}
            {!isLast && (
              <svg
                className="h-3 w-3 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
