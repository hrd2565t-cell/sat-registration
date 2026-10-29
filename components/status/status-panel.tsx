import Image from "next/image";
import type { ReactNode } from "react";

export type StatusTone = "pending" | "approved" | "rejected" | "reserve" | "action_required";

const toneStyles: Record<
  StatusTone,
  {
    header: string;
    border: string;
    icon: { src: string; width: number; height: number };
  }
> = {
  pending: {
    header: "bg-[#fce7ca]",
    border: "border-[#d9be8a]",
    icon: {
      src: "/assets/icon-status-pending.png",
      width: 19,
      height: 23,
    },
  },
  approved: {
    header: "bg-[#cff1d8]",
    border: "border-[#8cb99a]",
    icon: {
      src: "/assets/icon-status-approved.png",
      width: 24,
      height: 27,
    },
  },
  reserve: {
    header: "bg-[#dbeafe]",
    border: "border-[#93c5fd]",
    icon: {
      src: "/assets/icon-status-pending.png",
      width: 19,
      height: 23,
    },
  },
  rejected: {
    header: "bg-[#f9cfd1]",
    border: "border-[#c28b8e]",
    icon: {
      src: "/assets/icon-status-rejected.png",
      width: 20,
      height: 21,
    },
  },
  action_required: {
    header: "bg-[#ffedd5]",
    border: "border-[#fdba74]",
    icon: {
      src: "/assets/icon-status-pending.png",
      width: 19,
      height: 23,
    },
  },
};

interface StatusPanelProps {
  tone: StatusTone;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function StatusPanel({
  tone,
  title,
  description,
  action,
  className,
}: StatusPanelProps) {
  const styles = toneStyles[tone];

  return (
    <div
      className={`flex min-w-0 flex-col overflow-hidden rounded-lg border bg-white ${styles.border} ${
        className ?? ""
      }`}
    >
      <div
        className={`flex items-start gap-2 px-3.5 py-2 ${styles.header}`}
      >
        <Image
          src={styles.icon.src}
          alt=""
          width={styles.icon.width}
          height={styles.icon.height}
          className="mt-0.5 h-auto w-auto shrink-0 object-contain"
          aria-hidden="true"
        />
        <h3 className="text-[11.5px] font-bold leading-snug text-[#111827]">
          {title}
        </h3>
      </div>

      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-2.5">
        <p className="text-[11.5px] leading-[1.4] text-[#374151]">
          {description}
        </p>
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}
