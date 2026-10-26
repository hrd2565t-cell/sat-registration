"use client";

import Link from "next/link";
import { adminCourseOptions } from "@/lib/admin-data";
import { useApplications } from "@/lib/applications-store";

const colors = ["#328FDD", "#FE9732", "#47B471", "#7755B3", "#DD3942"];

export function ApplicantsChart() {
  const { applications } = useApplications();

  const chart = adminCourseOptions.map((course, index) => ({
    id: course.id,
    label: course.label,
    value: applications.filter((item) => item.courseId === course.id).length,
    color: colors[index % colors.length],
  }));

  const maxValue = Math.max(10, ...chart.map((item) => item.value));
  const axisMax = Math.ceil(maxValue / 10) * 10;
  const axisLabels = [axisMax, axisMax * 0.75, axisMax * 0.5, axisMax * 0.25, 0];

  return (
    <section className="flex h-full min-h-[355px] flex-col rounded-md border border-[#e3e6ea] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)] print:hidden">
      <h2 className="text-[14px] font-semibold leading-tight text-[#111827]">
        แผนภูมิแสดงผู้สมัครรายหลักสูตร
      </h2>

      <div className="mt-4 flex min-h-0 flex-1 gap-1.5">
        <div className="relative h-[208px] w-[24px] shrink-0 text-right text-[8px] leading-none text-[#374151]">
          {axisLabels.map((label, index) => (
            <span
              key={`${label}-${index}`}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${index * 25}%` }}
            >
              {Math.round(label)}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className="relative h-[208px]"
            role="img"
            aria-label="แผนภูมิแท่งแสดงจำนวนผู้สมัครรายหลักสูตร"
          >
            {[0, 25, 50, 75, 100].map((position) => (
              <div
                key={position}
                className="absolute inset-x-0 border-t border-[#e8ebef]"
                style={{ bottom: `${position}%` }}
                aria-hidden="true"
              />
            ))}

            <div className="absolute inset-0 flex items-end justify-around">
              {chart.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/applicants?course=${item.id}`}
                  className="group flex h-full w-7 flex-col items-center justify-end"
                  aria-label={`${item.label} ${item.value} คน ดูรายชื่อ`}
                  title={`ดูผู้สมัคร ${item.label}`}
                >
                  <span className="mb-1 text-[8px] font-medium leading-none text-[#111827]">
                    {item.value}
                  </span>
                  <div
                    className="w-6 rounded-t-[2px] transition-opacity group-hover:opacity-75"
                    style={{
                      height: `${Math.max(0, (item.value / axisMax) * 100)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </Link>
              ))}
            </div>
          </div>

          <div className="relative mt-1 h-[84px] shrink-0">
            <div className="flex justify-around">
              {chart.map((item) => (
                <div key={item.id} className="relative w-7">
                  <span
                    className="absolute right-3 top-1 whitespace-nowrap text-[8px] leading-none text-[#374151]"
                    style={{
                      transform: "rotate(-45deg)",
                      transformOrigin: "top right",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-[8.5px] leading-none text-[#6b7280]">
        คลิกที่แท่งกราฟเพื่อดูรายชื่อในหลักสูตรนั้น
      </p>
    </section>
  );
}
