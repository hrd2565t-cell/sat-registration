import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function ArrowLeftIcon({
  className = "h-3 w-3 shrink-0",
  ...props
}: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M19 12H5M11 18l-6-6 6-6"
      />
    </svg>
  );
}

export function ArrowRightIcon({
  className = "h-3.5 w-3.5 shrink-0",
  ...props
}: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 12h14M13 6l6 6-6 6"
      />
    </svg>
  );
}

export function DownloadIcon({
  className = "h-3 w-3 shrink-0",
  ...props
}: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
      />
    </svg>
  );
}

export function CalendarIcon({
  className = "h-[22px] w-[22px] shrink-0",
  ...props
}: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="5" width="18" height="16" rx="2.5" fill="#e8eef8" />
      <path
        d="M3 9.5h18V7.5A2.5 2.5 0 0018.5 5h-13A2.5 2.5 0 003 7.5v2z"
        fill="#d94a4a"
      />
      <path
        d="M8 3v4M16 3v4"
        stroke="#475569"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 13h3v3H7zM14 13h3v3h-3zM7 18h3M14 18h3"
        fill="#3b82f6"
        stroke="#3b82f6"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
