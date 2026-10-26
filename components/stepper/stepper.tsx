import * as React from "react";

interface StepperProps {
  currentStep: number;
  steps: { label: string }[];
}

export function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div className="flex w-full gap-[2px] overflow-hidden rounded-md border border-[#e5e7eb] bg-[#d1d5db]">
      {steps.map((step, index) => {
        const isActive = index + 1 === currentStep;
        const isLast = index === steps.length - 1;
        const isFirst = index === 0;

        const clipPath = isLast
          ? isFirst
            ? undefined
            : "polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%)"
          : isFirst
            ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
            : "polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)";

        return (
          <div
            key={index}
            className={`flex h-11 flex-1 items-center justify-center ${
              isActive ? "bg-[#1e3a8a]" : "bg-white"
            }`}
            style={{ clipPath }}
          >
            <span
              className={`text-[13px] font-semibold ${
                isActive ? "text-white" : "text-[#4b5563]"
              }`}
            >
              {index + 1}. {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
