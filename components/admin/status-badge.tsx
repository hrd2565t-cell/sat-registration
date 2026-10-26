import type { ApplicantStatus } from "@/lib/admin-data";

const styles: Record<
  ApplicantStatus,
  { wrapper: string; dot: string; label: string }
> = {
  pending: {
    wrapper: "border-[#e9c98e] bg-[#fff5df] text-[#9a5c00]",
    dot: "bg-[#e39a16]",
    label: "รอตรวจสอบ",
  },
  approved: {
    wrapper: "border-[#9bcfb0] bg-[#e8f8ee] text-[#176c3a]",
    dot: "bg-[#2f9e57]",
    label: "อนุมัติแล้ว",
  },
  rejected: {
    wrapper: "border-[#d8a0a3] bg-[#fce8e9] text-[#9e2a30]",
    dot: "bg-[#cf3d45]",
    label: "ไม่ผ่าน",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicantStatus;
  className?: string;
}) {
  const style = styles[status];

  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold ${style.wrapper} ${
        className ?? ""
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
