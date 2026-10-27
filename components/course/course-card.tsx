"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { getCourseScheduleDates } from "@/lib/courses";

export interface CourseCardProps {
  id: number;
  image: string;
  imageAlt: string;
  status: "open" | "full";
  seatsLeft?: number;
  title: string;
  registrationDate?: string;
  resultDate?: string;
  date: string;
  location: string;
  seats: string;
  warningMessage?: string;
  selected?: boolean;
  onSelect?: (id: number) => void;
  onViewDetails?: () => void;
}

function CalendarIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-[#6b7280]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-[#6b7280]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-[#6b7280]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      className="mt-[1px] h-3.5 w-3.5 shrink-0"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zM12 6c0 .552-.447 1-1 1s-1-.448-1-1 .447-1 1-1 1 .448 1 1z"
        clipRule="evenodd"
      ></path>
    </svg>
  );
}

export function CourseCard({
  id,
  image,
  imageAlt,
  status,
  seatsLeft,
  title,
  registrationDate,
  resultDate,
  date,
  location,
  seats,
  warningMessage,
  selected = false,
  onSelect,
  onViewDetails,
}: CourseCardProps) {
  const isFull = status === "full";
  const isLow = (seatsLeft ?? 0) <= 5;
  const schedule = getCourseScheduleDates({
    date,
    registrationDate,
    resultDate,
  });

  const badge = isFull ? (
    <span className="inline-flex min-w-[76px] items-center justify-center rounded-md bg-[#dc2626] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
      เต็มแล้ว
    </span>
  ) : (
    <span
      className={`inline-flex min-w-[88px] items-center justify-center rounded-md px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm ${
        isLow ? "bg-[#d97706]" : "bg-[#078A43]"
      }`}
    >
      เหลือ {seatsLeft} ที่นั่ง
    </span>
  );

  return (
    <div
      className={`group flex h-full flex-col overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-shadow hover:shadow-md ${
        selected ? "border-[#b91c1c]" : "border-[#ececec]"
      }`}
    >
      <div className="relative h-[124px] w-full overflow-hidden bg-[#e5e7eb]">
        <Image
          src={image}
          alt={imageAlt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 20vw"
        />
        <div className="absolute right-2 top-2 z-10">{badge}</div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <h3 className="text-[14px] font-bold leading-[1.35] text-[#16265E]">
          {title}
        </h3>

        <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-2 text-[11.5px] space-y-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-semibold text-[#1869bc]">📥 รับสมัคร:</span>
            <span className="font-bold text-[#1e3a8a] text-right">
              {schedule.registrationDate}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1.5 border-t border-[#eef2f6] pt-1">
            <span className="font-semibold text-[#c4080f]">📣 ประกาศผล:</span>
            <span className="font-bold text-[#991b1b] text-right">
              {schedule.resultDate}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 text-[12.5px] text-[#4b5563]">
          <div className="flex items-center gap-1.5">
            <CalendarIcon />
            <span>
              <strong className="font-semibold text-[#166534]">อบรม:</strong>{" "}
              {date}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <PinIcon />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <UsersIcon />
            <span>{seats}</span>
          </div>
        </div>

        <Button
          type="button"
          variant="light"
          className="h-9 w-full rounded-md px-2 py-0 text-[13px] border border-[#d1d5db] text-[#374151] hover:border-[#1e3a8a] hover:bg-[#eff6ff] hover:text-[#1e3a8a] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.();
          }}
        >
          <SearchIcon />
          ดูคุณสมบัติและเงื่อนไข
        </Button>

        {warningMessage && (
          <p className="flex items-start gap-1.5 text-[11.5px] leading-snug text-[#b45309]">
            <WarningIcon />
            <span>{warningMessage}</span>
          </p>
        )}

        <div className="mt-auto pt-1">
          {isFull ? (
            <button
              type="button"
              disabled
              className="h-9 w-full cursor-not-allowed rounded-md bg-[#d1d5db] text-[13.5px] font-semibold text-[#6b7280]"
            >
              เต็มแล้ว
            </button>
          ) : selected ? (
            <Button
              disabled
              className="h-9 w-full rounded-md bg-[#16265E] px-2 py-0 text-[13.5px] font-semibold text-white disabled:opacity-100"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              เลือกแล้ว
            </Button>
          ) : (
            <Button
              className="h-9 w-full rounded-md bg-[#16265E] px-2 py-0 text-[13.5px] font-semibold hover:bg-[#1e3a8a]"
              onClick={() => onSelect?.(id)}
            >
              เลือกหลักสูตร
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
