"use client";

import { useState } from "react";
import { useCourses } from "@/lib/courses-store";
import { useSportsEvents } from "@/lib/sports-events-store";

interface SyncDefaultsButtonProps {
  compact?: boolean;
  onSuccess?: (message: string) => void;
}

export function SyncDefaultsButton({
  compact = false,
  onSuccess,
}: SyncDefaultsButtonProps) {
  const { courses } = useCourses();
  const { events } = useSportsEvents();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [statusText, setStatusText] = useState("");

  const handleSaveToProject = async () => {
    if (status === "saving") return;

    setStatus("saving");
    setStatusText("กำลังบันทึก...");

    try {
      const response = await fetch("/api/admin/save-defaults", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courses,
          sportsEvents: events,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "บันทึกข้อมูลไม่สำเร็จ");
      }

      const msg = `บันทึกข้อมูลหลักลงระบบถาวรเรียบร้อยแล้ว (หลักสูตร ${result.coursesCount} รายการ, ปฏิทินกีฬา ${result.sportsEventsCount} รายการ)`;
      setStatus("saved");
      setStatusText("บันทึกถาวรแล้ว!");
      onSuccess?.(msg);

      setTimeout(() => {
        setStatus("idle");
        setStatusText("");
      }, 4000);
    } catch (err) {
      setStatus("error");
      setStatusText(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก"
      );
      setTimeout(() => {
        setStatus("idle");
        setStatusText("");
      }, 5000);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleSaveToProject}
        disabled={status === "saving"}
        title="บันทึกข้อมูลหลักสูตรและตารางแข่งขันกีฬาที่แก้ไขในเบราว์เซอร์นี้ ลงในไฟล์ระบบถาวร"
        className={`inline-flex items-center gap-1.5 rounded-[6px] font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60 ${
          compact ? "h-7 px-2.5 text-[10.5px]" : "h-8 px-3 text-[11px]"
        } ${
          status === "saved"
            ? "bg-[#15803d] hover:bg-[#166534]"
            : status === "error"
              ? "bg-[#dc2626] hover:bg-[#b91c1c]"
              : "bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#065f46]"
        }`}
      >
        <span>
          {status === "saving"
            ? "⏳"
            : status === "saved"
              ? "✅"
              : status === "error"
                ? "⚠️"
                : "💾"}
        </span>
        <span>
          {status === "saving"
            ? "กำลังบันทึก..."
            : status === "saved"
              ? statusText
              : "บันทึกเป็นข้อมูลหลักถาวร"}
        </span>
      </button>
    </div>
  );
}
