"use client";

import { useEffect, useRef, useState } from "react";
import type { ProvinceInfo } from "@/lib/provinces";
import type { Course } from "@/lib/courses";

interface RealLeafletMapProps {
  provinces: ProvinceInfo[];
  freqMap: Record<
    string,
    {
      courses: Course[];
      applicantCount: number;
      approvedCount: number;
      totalBudget: number;
    }
  >;
  onSelectProvince: (p: ProvinceInfo) => void;
}

export function RealLeafletMap({
  provinces,
  freqMap,
  onSelectProvince,
}: RealLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let isMounted = true;

    // ฟังก์ชันเริ่มสร้างแผนที่เมื่อ Leaflet script โหลดเสร็จแล้ว
    const initMap = () => {
      if (!isMounted || !containerRef.current) return;
      const L = (window as any).L;
      if (!L) {
        setLoadStatus("error");
        return;
      }

      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // สร้าง Map กึ่งกลางประเทศไทย [13.2, 101.0] ซูม 6
        const map = L.map(containerRef.current, {
          center: [13.2, 101.0],
          zoom: 6,
          minZoom: 5,
          maxZoom: 14,
          scrollWheelZoom: true,
        });

        mapInstanceRef.current = map;

        // Tile layer จาก OpenStreetMap (มาตรฐานสากล)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap · การกีฬาแห่งประเทศไทย (กกท.)',
          maxZoom: 18,
        }).addTo(map);

        // ปักหมุด 77 จังหวัด
        provinces.forEach((prov) => {
          if (prov.lat && prov.lng) {
            const data = freqMap[prov.nameTh];
            const courseCount = data?.courses.length || 0;
            const hasCourses = courseCount > 0;

            const radius = hasCourses ? (courseCount >= 3 ? 14 : courseCount === 2 ? 11 : 9) : 4;
            const fillColor = hasCourses
              ? courseCount >= 3
                ? "#16265E"
                : courseCount === 2
                ? "#2563eb"
                : "#0284c7"
              : "#94a3b8";

            const circle = L.circleMarker([prov.lat, prov.lng], {
              radius,
              fillColor,
              color: hasCourses ? "#ffffff" : "#cbd5e1",
              weight: hasCourses ? 2.5 : 1,
              opacity: 1,
              fillOpacity: hasCourses ? 0.9 : 0.4,
            }).addTo(map);

            // Tooltip แสดงชื่อจังหวัด
            circle.bindTooltip(
              `<strong>${prov.nameTh}</strong>${hasCourses ? ` (${courseCount} หลักสูตร)` : ""}`,
              { direction: "top", offset: [0, -radius] }
            );

            // Popup เจาะลึก
            const popupContent = document.createElement("div");
            popupContent.className = "text-xs p-1 space-y-1.5";
            popupContent.innerHTML = `
              <div class="font-bold text-sm text-[#16265E] border-b pb-1">
                จ.${prov.nameTh} <span class="text-[10px] text-gray-500 font-normal">(${prov.regionNameTh})</span>
              </div>
              <div class="text-gray-600">
                • หลักสูตรที่จัด: <strong class="text-[#16265E]">${courseCount} หลักสูตร</strong><br/>
                • ผู้ผ่านการอบรมจริง: <strong class="text-green-700">${data?.approvedCount || 0} คน</strong><br/>
                • งบประมาณรวม: <strong class="text-purple-900">฿${(data?.totalBudget || 0).toLocaleString()}</strong>
              </div>
            `;

            if (hasCourses) {
              const btn = document.createElement("button");
              btn.innerText = "🔍 ดูรายละเอียดหลักสูตร";
              btn.className = "mt-2 w-full rounded bg-[#16265E] text-white text-[11px] font-bold py-1 px-2 hover:bg-[#111e4a] cursor-pointer";
              btn.onclick = () => onSelectProvince(prov);
              popupContent.appendChild(btn);
            }

            circle.bindPopup(popupContent);
          }
        });

        setLoadStatus("ready");
      } catch (err) {
        console.warn("Leaflet init error:", err);
        setLoadStatus("error");
      }
    };

    // โหลด Leaflet CSS & JS อัตโนมัติในเบราว์เซอร์
    if (typeof window !== "undefined") {
      if ((window as any).L) {
        initMap();
      } else {
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(cssLink);

        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => initMap();
        script.onerror = () => {
          if (isMounted) setLoadStatus("error");
        };
        document.body.appendChild(script);
      }
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [provinces, freqMap, onSelectProvince]);

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
      {loadStatus === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs space-y-2 text-xs text-gray-600">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-[#16265E] border-t-transparent" />
          <p className="font-semibold text-[#16265E]">กำลังดาวน์โหลดแผนที่จริง OpenStreetMap...</p>
        </div>
      )}

      {loadStatus === "error" && (
        <div className="p-6 text-center space-y-3 max-w-sm">
          <div className="text-3xl">📡</div>
          <h4 className="text-sm font-bold text-gray-800">ไม่สามารถเชื่อมต่อ OpenStreetMap ได้ในขณะนี้</h4>
          <p className="text-xs text-gray-500">
            ระบบทำงานในโหมด Offline หรือเบราว์เซอร์ไม่ได้รับอนุญาตเชื่อมต่อเครือข่ายภายนอก
            ท่านสามารถสลับกลับไปใช้ <strong>&quot;แผนที่ยุทธศาสตร์ขวานทองแท้&quot;</strong> ที่ทำงานได้ 100% ทันที
          </p>
        </div>
      )}

      <div
        ref={containerRef}
        className={`w-full h-full ${loadStatus === "ready" ? "block" : "hidden"}`}
      />
    </div>
  );
}
