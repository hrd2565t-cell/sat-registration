import { DownloadIcon } from "@/components/ui/icons";

export function TimelineShareButton() {
  return (
    <a
      href="/assets/timeline-schedule.png"
      download="timeline-2569.png"
      className="flex h-[25px] w-full items-center justify-center gap-1 rounded-[4px] border border-[#d5dbe0] bg-[#eef2f5] text-[10px] font-medium text-[#374151] transition-colors hover:bg-[#e3e9ed] xl:h-[clamp(30px,2.2vw,36px)] xl:gap-1.5 xl:rounded-[5px] xl:text-[clamp(11.5px,0.8vw,13px)]"
    >
      <DownloadIcon className="h-[1.2em] w-[1.2em] shrink-0" />
      แชร์รูปภาพ (PNG)
    </a>
  );
}
