"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center gap-1.5 text-[9.5px] text-[#4b5563]">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="หน้าก่อนหน้า"
        className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-[#d1d5db] bg-white text-[#374151] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg
          className="h-2.5 w-2.5"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 5l-5 5 5 5"
          />
        </svg>
      </button>

      <span className="whitespace-nowrap">หน้า</span>
      <span
        data-testid="pagination-page"
        className="flex h-[22px] min-w-[22px] items-center justify-center rounded-[3px] bg-[#e5e7eb] px-1 text-[9.5px] font-medium text-[#111827]"
      >
        {page}
      </span>
      <span className="whitespace-nowrap">จาก {totalPages}</span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="หน้าถัดไป"
        className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-[#d1d5db] bg-white text-[#374151] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg
          className="h-2.5 w-2.5"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 5l5 5-5 5"
          />
        </svg>
      </button>
    </div>
  );
}
