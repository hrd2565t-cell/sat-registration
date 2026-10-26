"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { Course } from "@/lib/courses";
import { getSeedCourse, type CourseUpdate } from "@/lib/courses-store";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_SOURCE_IMAGE_BYTES,
  estimateDataUrlBytes,
  resizeImageFile,
} from "@/lib/resize-image";

const fieldClass =
  "mt-1 h-9 w-full rounded-[5px] border border-[#d1d5db] bg-white px-3 text-[12.5px] text-[#1f2937] outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#6b7280]";

const labelClass = "block text-[11.5px] font-medium text-[#374151]";

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeWidth="1.8"
        d="M5 5l10 10M15 5L5 15"
      />
    </svg>
  );
}

export function CourseEditDialog({
  course,
  onClose,
  onSave,
}: {
  course: Course;
  onClose: () => void;
  /** Return `true` on success, or an error message to keep the dialog open. */
  onSave: (patch: CourseUpdate) => boolean | string;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const seedImage = getSeedCourse(course.id)?.image ?? course.image;
  const [image, setImage] = useState(course.image);
  const [imageInfo, setImageInfo] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [date, setDate] = useState(course.date);
  const [location, setLocation] = useState(course.location);
  const [seats, setSeats] = useState(course.seats);
  const [status, setStatus] = useState<Course["status"]>(course.status);
  const [seatsLeft, setSeatsLeft] = useState(
    String(course.seatsLeft ?? (course.status === "open" ? 0 : ""))
  );
  const [warningMessage, setWarningMessage] = useState(
    course.warningMessage ?? ""
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => titleRef.current?.focus(), 60);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (
      !ACCEPTED_IMAGE_TYPES.includes(
        file.type as (typeof ACCEPTED_IMAGE_TYPES)[number]
      )
    ) {
      setError("รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP");
      return;
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      setError("ไฟล์รูปต้องมีขนาดไม่เกิน 10 MB");
      return;
    }

    setImageBusy(true);
    setError("");
    try {
      const result = await resizeImageFile(file);
      setImage(result.dataUrl);
      setImageInfo(
        `${file.name} · ${result.width}×${result.height} px · ${Math.max(
          1,
          Math.round(estimateDataUrlBytes(result.dataUrl) / 1024)
        )} KB`
      );
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "ไม่สามารถอ่านไฟล์รูปภาพได้"
      );
    } finally {
      setImageBusy(false);
    }
  };

  const handleResetImage = () => {
    setImage(seedImage);
    setImageInfo("");
    if (error) setError("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (imageBusy) return;

    const trimmedTitle = title.trim();
    const trimmedDate = date.trim();
    const trimmedLocation = location.trim();
    const trimmedSeats = seats.trim();
    const trimmedWarning = warningMessage.trim();
    const remaining = Number(seatsLeft);
    const capacity = Number(trimmedSeats.match(/\d+/)?.[0] ?? "");

    if (trimmedTitle.length < 3) {
      setError("กรุณากรอกชื่อหลักสูตรอย่างน้อย 3 ตัวอักษร");
      return;
    }
    if (!trimmedDate) {
      setError("กรุณากรอกช่วงวันที่อบรม");
      return;
    }
    if (!trimmedLocation) {
      setError("กรุณากรอกสถานที่อบรม");
      return;
    }
    if (!trimmedSeats) {
      setError("กรุณากรอกจำนวนที่นั่ง");
      return;
    }
    if (!Number.isInteger(remaining) || remaining < 0) {
      setError("ที่นั่งคงเหลือต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป");
      return;
    }
    if (status === "open" && remaining < 1) {
      setError("หลักสูตรที่เปิดรับต้องมีที่นั่งคงเหลืออย่างน้อย 1 ที่");
      return;
    }
    if (Number.isFinite(capacity) && remaining > capacity) {
      setError("ที่นั่งคงเหลือต้องไม่เกินจำนวนที่นั่งทั้งหมด");
      return;
    }

    const result = onSave({
      title: trimmedTitle,
      date: trimmedDate,
      location: trimmedLocation,
      seats: trimmedSeats,
      status,
      seatsLeft: status === "full" ? undefined : remaining,
      warningMessage: trimmedWarning || undefined,
      ...(image !== course.image ? { image } : {}),
    });
    if (typeof result === "string") setError(result);
  };

  const isCustomImage = image.startsWith("data:image/");

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="ปิดหน้าต่างแก้ไขหลักสูตร"
        onClick={onClose}
        className="absolute inset-0 bg-[#0f172a]/55 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-edit-title"
        className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-[580px] flex-col rounded-t-xl border border-[#e5e7eb] bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eef0f3] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
              รหัสหลักสูตร #{course.id}
            </p>
            <h2
              id="course-edit-title"
              className="mt-0.5 text-[16px] font-semibold text-[#111827]"
            >
              แก้ไขรายละเอียดหลักสูตร
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-[#6b7280]">
              การเปลี่ยนแปลงจะมีผลกับหน้าเว็บสาธารณะทันที
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]"
          >
            <CloseIcon />
          </button>
        </div>

        <form
          id="course-edit-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5"
        >
          <div className="space-y-3">
            <div>
              <p className={labelClass}>รูปประกอบหลักสูตร</p>
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-[6px] border border-[#e5e7eb] bg-[#e5e7eb] sm:w-[200px]">
                  <Image
                    src={image}
                    alt={`ตัวอย่างรูป ${course.imageAlt}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 200px"
                    className="object-cover"
                  />
                  {imageBusy && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-[11px] font-medium text-[#1e3a8a]">
                      กำลังปรับขนาดรูป…
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    ref={fileInputRef}
                    id="course-image"
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageBusy}
                      className="inline-flex h-9 items-center justify-center rounded-[5px] border border-[#c7d7ea] bg-white px-3 text-[12px] font-semibold text-[#1e3a8a] transition-colors hover:bg-[#eff6ff] disabled:cursor-wait disabled:opacity-60"
                    >
                      เลือกรูปใหม่
                    </button>
                    {image !== seedImage && (
                      <button
                        type="button"
                        onClick={handleResetImage}
                        disabled={imageBusy}
                        className="inline-flex h-9 items-center justify-center rounded-[5px] border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#374151] transition-colors hover:bg-[#f8fafc] disabled:opacity-60"
                      >
                        คืนค่ารูปเดิม
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#6b7280]">
                    {imageInfo ||
                      (isCustomImage
                        ? "ใช้รูปที่อัปโหลดเอง"
                        : "ใช้รูปมาตรฐานของระบบ")}
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#6b7280]">
                    JPG, PNG หรือ WebP ไม่เกิน 10 MB · แนะนำสัดส่วน 16:9
                    ระบบจะย่อรูปอัตโนมัติ
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#9a5c00]">
                    รูปที่อัปโหลดจะเก็บไว้ในเบราว์เซอร์นี้เท่านั้น
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="course-title" className={labelClass}>
                ชื่อหลักสูตร
              </label>
              <input
                id="course-title"
                ref={titleRef}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (error) setError("");
                }}
                className={fieldClass}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="course-date" className={labelClass}>
                  ช่วงวันที่อบรม
                </label>
                <input
                  id="course-date"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="เช่น 15-20 พ.ค. 2569"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="course-status" className={labelClass}>
                  สถานะการรับสมัคร
                </label>
                <select
                  id="course-status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as Course["status"]);
                    if (error) setError("");
                  }}
                  className={fieldClass}
                >
                  <option value="open">เปิดรับสมัคร</option>
                  <option value="full">เต็มแล้ว / ปิดรับ</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="course-location" className={labelClass}>
                สถานที่อบรม
              </label>
              <input
                id="course-location"
                value={location}
                onChange={(event) => {
                  setLocation(event.target.value);
                  if (error) setError("");
                }}
                className={fieldClass}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="course-seats" className={labelClass}>
                  จำนวนที่นั่ง
                </label>
                <input
                  id="course-seats"
                  value={seats}
                  onChange={(event) => {
                    setSeats(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="เช่น จำนวนที่นั่ง 50 คน"
                  className={fieldClass}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="course-seats-left" className={labelClass}>
                    ที่นั่งคงเหลือ
                  </label>
                  <span className="rounded bg-[#eff6ff] px-1.5 py-0.5 text-[9.5px] font-medium text-[#1e40af]">
                    คำนวณให้อัตโนมัติ
                  </span>
                </div>
                <input
                  id="course-seats-left"
                  type="number"
                  min={0}
                  value={status === "full" ? "0" : seatsLeft}
                  disabled={status === "full"}
                  onChange={(event) => {
                    setSeatsLeft(event.target.value);
                    if (error) setError("");
                  }}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="course-warning" className={labelClass}>
                หมายเหตุ / คุณสมบัติเฉพาะ
              </label>
              <textarea
                id="course-warning"
                value={warningMessage}
                onChange={(event) => setWarningMessage(event.target.value)}
                rows={2}
                placeholder="เว้นว่างได้หากไม่มีหมายเหตุ"
                className="mt-1 w-full resize-y rounded-[5px] border border-[#d1d5db] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-[#1f2937] outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-[11px] text-[#dc2626]">
              {error}
            </p>
          )}
        </form>

        <div className="flex flex-col-reverse gap-2 border-t border-[#eef0f3] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5 sm:pb-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-[5px] border border-[#d1d5db] bg-white px-4 text-[12px] font-medium text-[#374151] transition-colors hover:bg-[#f8fafc] sm:h-9"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="course-edit-form"
            className="inline-flex h-10 items-center justify-center rounded-[5px] bg-[#1e3a8a] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#1e40af] sm:h-9"
          >
            บันทึกการแก้ไข
          </button>
        </div>
      </div>
    </div>
  );
}
