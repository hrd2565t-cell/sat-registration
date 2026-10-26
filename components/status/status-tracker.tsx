import * as React from "react";

export type StatusState = "done" | "active" | "pending";

export interface StatusStep {
  label: string;
  state: StatusState;
}

interface StatusTrackerProps {
  steps: StatusStep[];
  className?: string;
}

const labelColors: Record<StatusState, string> = {
  done: "text-[#2f9e57]",
  active: "text-[#d99400]",
  pending: "text-[#9ca3af]",
};

function StatusIcon({ state }: { state: StatusState }) {
  if (state === "done") {
    return (
      <svg
        className="h-4 w-4 shrink-0 text-[#2f9e57]"
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

  if (state === "active") {
    return (
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="9" fill="#f0a500" />
        <circle
          cx="10"
          cy="10"
          r="5.25"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
        <path
          d="M10 7.2v3.1l2 1.4"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8.25" stroke="#cbd5e1" strokeWidth="1.5" />
    </svg>
  );
}

function Connector({ state }: { state: StatusState }) {
  const color = state === "done" ? "text-[#2f9e57]" : "text-[#c4c9d1]";

  return (
    <div
      className={`mt-[7px] flex shrink-0 items-center sm:mt-0 ${color}`}
      aria-hidden="true"
    >
      <span className="h-px w-3 bg-current sm:w-6" />
      <svg
        className="hidden h-2.5 w-2.5 sm:block"
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1 5h7M5 1.5L8.5 5 5 8.5"
        />
      </svg>
    </div>
  );
}

export function StatusTracker({ steps, className }: StatusTrackerProps) {
  return (
    <div
      className={`flex w-full items-start justify-center gap-1 sm:items-center sm:gap-0 ${
        className ?? ""
      }`}
    >
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={index}>
            <div className="flex max-w-[110px] flex-col items-center gap-1 text-center sm:max-w-none sm:flex-row sm:gap-1.5 sm:text-left">
              <StatusIcon state={step.state} />
              <span
                className={`text-[10.5px] font-semibold leading-tight sm:text-[12px] ${
                  labelColors[step.state]
                }`}
              >
                {step.label}
              </span>
            </div>
            {!isLast && <Connector state={step.state} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
