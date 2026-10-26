import * as React from "react";

type BarTone = "open" | "review" | "training" | "result";

interface TimelineBar {
  label: string;
  tone: BarTone;
  left: number;
  width: number;
}

interface TimelineRow {
  title: string;
  english: string;
  bars: TimelineBar[];
}

const bars: Record<BarTone, string> = {
  open: "bg-[#1869bc]",
  review: "bg-[#ef8507]",
  training: "bg-[#198c32]",
  result: "bg-[#c4080f]",
};

const rows: TimelineRow[] = [
  {
    title: "ผู้ฝึกสอนกีฬาระดับชาติ",
    english: "(National Coach)",
    bars: [
      { label: "15 ต.ค. - 5 พ.ย.", tone: "open", left: 17.8, width: 22.3 },
      { label: "6 พ.ย. - 10 พ.ย.", tone: "review", left: 40.4, width: 12.3 },
      { label: "15 พ.ย. - 20 พ.ย.", tone: "training", left: 56.1, width: 15.2 },
      { label: "25 พ.ย.", tone: "result", left: 74.5, width: 6.5 },
    ],
  },
  {
    title: "ผู้ตัดสินกีฬาอาชีพ",
    english: "(Professional Referee)",
    bars: [
      { label: "15 ต.ค. - 10 พ.ย.", tone: "open", left: 17.8, width: 28.7 },
      { label: "11 พ.ย. - 15 พ.ย.", tone: "review", left: 46.9, width: 13.5 },
      { label: "20 พ.ย. - 25 พ.ย.", tone: "training", left: 60.9, width: 15.4 },
      { label: "30 พ.ย.", tone: "result", left: 79.7, width: 6.5 },
    ],
  },
  {
    title: "วิทยาศาสตร์การกีฬาขั้นพื้นฐาน",
    english: "(Basic Sports Science)",
    bars: [
      { label: "10 ต.ค. - 20 ต.ค.", tone: "open", left: 5.5, width: 18.2 },
      { label: "21 ต.ค. - 25 ต.ค.", tone: "review", left: 24, width: 13.1 },
      { label: "1 พ.ย. - 5 พ.ย.", tone: "training", left: 72.9, width: 13.7 },
      { label: "10 พ.ย.", tone: "result", left: 92, width: 6.5 },
    ],
  },
  {
    title: "การบริหารจัดการองค์การกีฬา",
    english: "(Sports Management)",
    bars: [
      { label: "1 พ.ย. - 15 พ.ย.", tone: "open", left: 37.1, width: 14.8 },
      { label: "16 พ.ย. - 20 พ.ย.", tone: "review", left: 52.3, width: 13.7 },
      { label: "8 ธ.ค. - 12 ธ.ค.", tone: "training", left: 77.1, width: 13.9 },
      { label: "18 ธ.ค.", tone: "result", left: 92.8, width: 6.4 },
    ],
  },
  {
    title: "จิตวิทยาการกีฬาสำหรับผู้ฝึกสอน",
    english: "(Sports Psychology)",
    bars: [
      { label: "15 ต.ค. - 15 พ.ย.", tone: "open", left: 17.8, width: 34.2 },
      { label: "16 พ.ย. - 20 พ.ย.", tone: "review", left: 52.3, width: 13.7 },
      { label: "14 ธ.ค. - 18 ธ.ค.", tone: "training", left: 74.6, width: 14.5 },
      { label: "24 ธ.ค.", tone: "result", left: 92.8, width: 6.4 },
    ],
  },
];

const columns = ["หลักสูตร", "ตุลาคม 2569", "6 พ.ย. 2569", "15 พ.ย. 2569", "ธันวาคม 2569"];

function Legend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-[#374151] xl:gap-x-6 xl:gap-y-1.5 xl:text-[clamp(10.5px,0.8vw,12.5px)]">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#1869bc] xl:h-2.5 xl:w-2.5" />
        เปิดรับสมัคร
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[13px] font-bold leading-none text-[#ef8507] xl:text-[clamp(13px,1vw,16px)]" aria-hidden="true">
          ➜
        </span>
        ตรวจคุณสมบัติ
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[13px] font-bold leading-none text-[#198c32] xl:text-[clamp(13px,1vw,16px)]" aria-hidden="true">
          ➜
        </span>
        ช่วงเวลาจัดอบรม
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#c4080f] xl:h-2.5 xl:w-2.5" />
        ประกาศผล
      </span>
    </div>
  );
}

function TimelineBarItem({ bar }: { bar: TimelineBar }) {
  const compact = bar.tone === "result";

  return (
    <div
      className={`absolute top-1/2 z-10 flex h-[18px] -translate-y-1/2 items-center justify-center rounded-full font-semibold leading-none text-white shadow-sm xl:h-[clamp(21px,1.6vw,28px)] ${
        compact
          ? "px-0.5 text-[6px] xl:px-1 xl:text-[clamp(6.5px,0.5vw,8px)]"
          : "px-1 text-[7.5px] xl:px-1.5 xl:text-[clamp(8px,0.6vw,10.5px)]"
      } ${bars[bar.tone]}`}
      style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
    >
      <span className="truncate">{bar.label}</span>
      {bar.tone === "training" && (
        <span className="absolute right-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white/65 xl:right-2 xl:h-2 xl:w-2" />
      )}
    </div>
  );
}

export function TimelineSchedule() {
  return (
    <section className="mx-auto mt-[7px] w-full max-w-[670px] rounded-xl border border-[#e0e5e8] bg-white p-2 shadow-[0_1px_4px_rgba(16,24,40,0.06)] xl:mt-[clamp(8px,0.75vw,12px)] xl:max-w-[clamp(820px,62vw,1080px)] xl:rounded-[clamp(12px,0.9vw,16px)] xl:p-[clamp(10px,0.9vw,14px)]">
      <Legend />

      <div className="mt-2 overflow-x-auto pb-0.5 xl:mt-[clamp(8px,0.75vw,12px)]">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-[#1f2937]">
          <colgroup>
            <col className="w-[21.5%]" />
            <col />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-[#f2f4f6] text-[10px] font-semibold text-[#28303b] xl:text-[clamp(10.5px,0.8vw,13px)]">
              {columns.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={`h-[24px] border border-[#d8dee4] px-1 text-center font-semibold xl:h-[clamp(28px,2vw,36px)] xl:px-2 ${
                    index === 0 ? "border-l-0" : ""
                  }`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.title} className="h-[37px] xl:h-[clamp(43px,3.1vw,58px)]">
                <th
                  scope="row"
                  className="border border-t-0 border-l-0 border-[#d8dee4] px-2 py-0.5 text-left align-middle text-[9.5px] font-semibold leading-[1.2] xl:px-3 xl:text-[clamp(10.5px,0.8vw,12.5px)]"
                >
                  {row.title}
                  <span className="mt-0.5 block text-[8.5px] font-normal leading-[1.1] text-[#4b5563] xl:text-[clamp(9px,0.65vw,11px)]">
                    {row.english}
                  </span>
                </th>
                <td colSpan={4} className="relative border border-t-0 border-r-0 border-[#d8dee4] p-0">
                  <div className="relative h-[37px] overflow-hidden xl:h-[clamp(43px,3.1vw,58px)]">
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-4" aria-hidden="true">
                      <span className="border-r border-[#edf0f2]" />
                      <span className="border-r border-[#edf0f2]" />
                      <span className="border-r border-[#edf0f2]" />
                      <span />
                    </div>
                    {row.bars.map((bar) => (
                      <TimelineBarItem key={`${row.title}-${bar.tone}`} bar={bar} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
