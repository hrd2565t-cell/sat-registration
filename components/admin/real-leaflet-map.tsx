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
  selectedYear?: string;
}

export function RealLeafletMap({
  provinces,
  freqMap,
  onSelectProvince,
  selectedYear = "all",
}: RealLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const geoJsonLayerRef = useRef<any>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [geoData, setGeoData] = useState<any>(null);
  const [activeProvinceCount, setActiveProvinceCount] = useState(0);

  // 1. โหลดข้อมูล GeoJSON ขอบเขต 77 จังหวัดประเทศไทย (บันทึกไว้ใน /data/thailand-provinces.geojson)
  useEffect(() => {
    let isMounted = true;
    fetch("/data/thailand-provinces.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load local GeoJSON");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setGeoData(data);
        }
      })
      .catch((err) => {
        console.warn("Local GeoJSON fetch failed, falling back to CDN:", err);
        // Fallback ฉุกเฉินไปที่ GitHub CDN หากไฟล์ local มีปัญหา
        fetch("https://raw.githubusercontent.com/apisit/thailand.json/master/thailand.json")
          .then((r) => r.json())
          .then((data) => {
            if (isMounted) setGeoData(data);
          })
          .catch((e) => {
            console.error("All GeoJSON sources failed:", e);
            if (isMounted) setLoadStatus("error");
          });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. คำนวณสีของแต่ละจังหวัดตามความถี่ (Choropleth Color Scale ตามรูป Esri)
  const getProvinceColor = (count: number) => {
    if (count >= 3) return "#b91c1c"; // สีแดงเลือดหมู/เข้ม (3 ครั้งขึ้นไป)
    if (count === 2) return "#f97316"; // สีส้ม (2 ครั้ง)
    if (count === 1) return "#fde047"; // สีเหลืองนวล (1 ครั้ง)
    return "#ffffff"; // สีขาว/เทาอ่อนมาก (0 ครั้ง)
  };

  const getProvinceBorderColor = (count: number) => {
    if (count >= 3) return "#7f1d1d";
    if (count === 2) return "#ea580c";
    if (count === 1) return "#ca8a04";
    return "#94a3b8"; // สีเทา-ฟ้าอ่อนเห็นขอบชัดเจน
  };

  // 3. เริ่มต้นและอัปเดต Leaflet Map
  useEffect(() => {
    let isMounted = true;

    // คำนวณจำนวนจังหวัดที่มีการจัดอบรม
    let countActive = 0;
    Object.values(freqMap).forEach((d) => {
      if (d.courses.length > 0) countActive++;
    });
    setActiveProvinceCount(countActive);

    const initMap = () => {
      if (!isMounted || !containerRef.current || !geoData) return;
      const L = (window as any).L;
      if (!L) {
        setLoadStatus("error");
        return;
      }

      try {
        // หากมีแผนที่เดิมอยู่แล้ว ให้ล้างออกก่อน
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // สร้างแผนที่ Leaflet กึ่งกลางประเทศไทย
        const map = L.map(containerRef.current, {
          center: [13.2, 101.2],
          zoom: 6,
          minZoom: 5,
          maxZoom: 14,
          scrollWheelZoom: true,
        });
        mapInstanceRef.current = map;

        // 1. แผนที่ฐาน Esri World Light Gray Base (เหมือนรูปตัวอย่างเป๊ะๆ)
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ · การกีฬาแห่งประเทศไทย',
            maxZoom: 16,
          }
        ).addTo(map);

        // 2. แผนที่ข้อความอ้างอิง Esri World Light Gray Reference (แสดงชื่อประเทศ/มหาสมุทรแบบมินิมอล)
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 16,
            opacity: 0.85,
          }
        ).addTo(map);

        // 3. สร้างเลเยอร์ Choropleth ขอบเขต 77 จังหวัด
        const geoLayer = L.geoJSON(geoData, {
          style: (feature: any) => {
            const nameTh = feature?.properties?.nameTh || feature?.properties?.name;
            const data = freqMap[nameTh] || { courses: [] };
            const courseCount = data.courses.length;
            const hasCourses = courseCount > 0;

            return {
              fillColor: getProvinceColor(courseCount),
              weight: hasCourses ? (courseCount >= 3 ? 2 : 1.5) : 1,
              opacity: 1,
              color: getProvinceBorderColor(courseCount),
              dashArray: hasCourses ? "" : "2, 2",
              fillOpacity: hasCourses ? (courseCount >= 3 ? 0.92 : courseCount === 2 ? 0.88 : 0.85) : 0.15,
            };
          },
          onEachFeature: (feature: any, layer: any) => {
            const nameTh = feature?.properties?.nameTh || feature?.properties?.name;
            const regionNameTh = feature?.properties?.regionNameTh || "ประเทศไทย";
            const data = freqMap[nameTh] || {
              courses: [],
              applicantCount: 0,
              approvedCount: 0,
              totalBudget: 0,
            };
            const courseCount = data.courses.length;
            const provObj = provinces.find((p) => p.nameTh === nameTh);

            // Tooltip ลอยเมื่อชี้เมาส์
            layer.bindTooltip(
              `
                <div class="px-1.5 py-0.5 text-xs">
                  <div class="font-bold text-[#16265E] flex items-center gap-1">
                    <span>${nameTh}</span>
                    <span class="text-[10px] text-gray-500 font-normal">(${regionNameTh})</span>
                  </div>
                  <div class="text-[11px] mt-0.5 ${courseCount > 0 ? "text-blue-900 font-semibold" : "text-gray-500"}">
                    ${courseCount > 0 ? `จัดอบรม ${courseCount} หลักสูตร (ผู้ผ่าน ${data.approvedCount} คน)` : "ยังไม่มีการจัดอบรม"}
                  </div>
                </div>
              `,
              {
                sticky: true,
                direction: "auto",
                className: "custom-leaflet-tooltip shadow-sm rounded-md border border-gray-200",
              }
            );

            // Effect เมื่อ Hover
            layer.on({
              mouseover: (e: any) => {
                const target = e.target;
                target.setStyle({
                  weight: 2.5,
                  color: "#16265E",
                  fillOpacity: courseCount > 0 ? 0.95 : 0.4,
                });
                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                  target.bringToFront();
                }
              },
              mouseout: (e: any) => {
                geoLayer.resetStyle(e.target);
              },
              click: () => {
                if (provObj) {
                  onSelectProvince(provObj);
                }
              },
            });

            // Popup เจาะลึกเมื่อคลิก
            const popupDiv = document.createElement("div");
            popupDiv.className = "p-1 space-y-2 text-xs min-w-[230px]";

            const courseListHtml =
              courseCount > 0
                ? `
                  <div class="space-y-1 pt-1 border-t border-gray-200">
                    <div class="text-[11px] font-bold text-gray-700">รายชื่อหลักสูตรที่จัด:</div>
                    <ul class="space-y-1 max-h-36 overflow-y-auto text-[11px] pr-1">
                      ${data.courses
                        .map(
                          (c, idx) => `
                        <li class="p-1 rounded bg-blue-50/60 border border-blue-100 flex items-start gap-1">
                          <span class="font-bold text-blue-900 shrink-0">${idx + 1}.</span>
                          <span class="text-gray-800 line-clamp-2">${c.title}</span>
                        </li>
                      `
                        )
                        .join("")}
                    </ul>
                  </div>
                `
                : `
                  <div class="text-[11px] text-gray-400 italic py-1 text-center">
                    ยังไม่มีการจัดอบรมในจังหวัดนี้ในปีงบประมาณที่เลือก
                  </div>
                `;

            popupDiv.innerHTML = `
              <div class="border-b pb-1 flex items-center justify-between font-bold text-sm text-[#16265E]">
                <span>จ.${nameTh}</span>
                <span class="text-[11px] font-normal px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">${regionNameTh}</span>
              </div>
              <div class="bg-gray-50 rounded-lg p-2 border border-gray-100 space-y-1 text-gray-700">
                <div class="flex justify-between">
                  <span>หลักสูตรที่จัด:</span>
                  <strong class="text-[#16265E]">${courseCount} หลักสูตร</strong>
                </div>
                <div class="flex justify-between">
                  <span>ผู้ผ่านการอบรมจริง:</span>
                  <strong class="text-green-700">${data.approvedCount.toLocaleString()} คน</strong>
                </div>
                <div class="flex justify-between">
                  <span>งบประมาณจัดสรร:</span>
                  <strong class="text-purple-900">฿${data.totalBudget.toLocaleString()}</strong>
                </div>
              </div>
              ${courseListHtml}
            `;

            if (provObj && courseCount > 0) {
              const btn = document.createElement("button");
              btn.innerText = "🔍 กรองดูข้อมูลจังหวัดนี้ในตาราง";
              btn.className =
                "mt-2 w-full rounded-md bg-[#16265E] text-white text-[11px] font-bold py-1.5 px-2 hover:bg-[#111e4a] cursor-pointer shadow-xs transition-colors";
              btn.onclick = () => onSelectProvince(provObj);
              popupDiv.appendChild(btn);
            }

            layer.bindPopup(popupDiv, { maxWidth: 300 });
          },
        }).addTo(map);

        geoJsonLayerRef.current = geoLayer;

        // ปรับขนาดให้อยู่กึ่งกลางประเทศพอดี
        try {
          map.fitBounds(geoLayer.getBounds(), { padding: [15, 15] });
        } catch (e) {
          // ignore
        }

        setLoadStatus("ready");
      } catch (err) {
        console.warn("Leaflet choropleth init error:", err);
        setLoadStatus("error");
      }
    };

    // โหลด Leaflet CSS & JS อัตโนมัติในเบราว์เซอร์
    if (typeof window !== "undefined") {
      if ((window as any).L && geoData) {
        initMap();
      } else {
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(cssLink);

        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => {
          if (geoData) initMap();
        };
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
  }, [provinces, freqMap, geoData, onSelectProvince, selectedYear]);

  return (
    <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-gray-200 bg-[#f8fafc] flex items-center justify-center shadow-inner">
      {loadStatus === "loading" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/85 backdrop-blur-xs space-y-2 text-xs text-gray-600">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#16265E] border-t-transparent" />
          <p className="font-bold text-[#16265E]">กำลังประมวลผลแผนที่ความถี่ 77 จังหวัด (Esri Choropleth)...</p>
          <span className="text-[11px] text-gray-500">โหลดขอบเขตภูมิศาสตร์และคำนวณการจัดสรรงบประมาณ</span>
        </div>
      )}

      {loadStatus === "error" && (
        <div className="p-6 text-center space-y-3 max-w-sm z-20">
          <div className="text-3xl">📡</div>
          <h4 className="text-sm font-bold text-gray-800">ไม่สามารถเชื่อมต่อแผนที่ดาวเทียมได้ในขณะนี้</h4>
          <p className="text-xs text-gray-500">
            ระบบทำงานในโหมด Offline หรือเบราว์เซอร์ไม่ได้รับอนุญาตเชื่อมต่อเครือข่ายภายนอก
            ท่านสามารถสลับไปใช้ <strong>&quot;แผนที่ยุทธศาสตร์ขวานทองแท้ (Vector)&quot;</strong> ที่ทำงานได้ทันที
          </p>
        </div>
      )}

      {/* แถบคำอธิบายระดับสีความถี่ (Choropleth Legend Overlay) มุมขวาล่าง */}
      {loadStatus === "ready" && (
        <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/80 p-3 text-xs space-y-2 max-w-[230px]">
          <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
            <span className="font-bold text-[#16265E] text-[11px] flex items-center gap-1">
              <span>📊 ความถี่การจัดอบรม</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-800">
              {activeProvinceCount} / 77 จังหวัด
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-3.5 rounded border border-gray-300 bg-white shadow-2xs"></span>
                <span className="text-gray-600">0 ครั้ง (ไม่มีจัด)</span>
              </div>
              <span className="text-[10px] text-gray-400">
                {77 - activeProvinceCount} จว.
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-3.5 rounded border border-amber-500 bg-[#fde047] shadow-2xs"></span>
                <span className="text-gray-800 font-medium">1 ครั้ง</span>
              </div>
              <span className="text-[10px] font-semibold text-amber-700">
                {Object.values(freqMap).filter((d) => d.courses.length === 1).length} จว.
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-3.5 rounded border border-orange-500 bg-[#f97316] shadow-2xs"></span>
                <span className="text-gray-800 font-medium">2 ครั้ง</span>
              </div>
              <span className="text-[10px] font-semibold text-orange-700">
                {Object.values(freqMap).filter((d) => d.courses.length === 2).length} จว.
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-3.5 rounded border border-red-800 bg-[#b91c1c] shadow-2xs"></span>
                <span className="text-gray-800 font-medium">3 ครั้งขึ้นไป</span>
              </div>
              <span className="text-[10px] font-semibold text-red-700">
                {Object.values(freqMap).filter((d) => d.courses.length >= 3).length} จว.
              </span>
            </div>
          </div>

          <div className="pt-1 border-t border-gray-100 text-[10px] text-gray-400 leading-tight">
            💡 คลิกที่จังหวัดเพื่อดูหลักสูตรและงบประมาณ
          </div>
        </div>
      )}

      {/* แถบคำแนะนำเครื่องมือด้านบนซ้าย */}
      {loadStatus === "ready" && (
        <div className="absolute top-3 left-14 z-[1000] bg-white/90 backdrop-blur-xs rounded-lg shadow-sm border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600 flex items-center gap-1.5 hidden sm:flex">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>แผนที่ Esri Light Gray Canvas & Choropleth 77 จังหวัด</span>
        </div>
      )}

      <div
        ref={containerRef}
        className={`w-full h-full ${loadStatus === "ready" ? "block" : "hidden"}`}
      />
    </div>
  );
}
