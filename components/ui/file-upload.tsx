"use client";

import * as React from "react";

export interface FileItem {
  name: string;
  size: string;
  dataUrl?: string;
  type?: string;
}

interface FileUploadProps {
  label?: string;
  files: FileItem[];
  onAdd?: (file: FileItem) => void;
  onRemove?: (index: number) => void;
  maxFiles?: number;
  disabled?: boolean;
  emptyText?: string;
  accept?: string;
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function FileUpload({
  label,
  files,
  onAdd,
  onRemove,
  maxFiles = 1,
  disabled = false,
  emptyText = "ยังไม่ได้แนบไฟล์",
  accept = ".jpg,.jpeg,.png,.pdf",
}: FileUploadProps) {
  const canUpload = files.length < maxFiles;
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handlePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onAdd) return;

    const fileType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      onAdd({
        name: file.name,
        size: formatSize(file.size),
        dataUrl: reader.result as string,
        type: fileType,
      });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label className="text-[12.5px] font-medium text-[#1f2937]">{label}</label>
      )}
      {files.length === 0 ? (
        <button
          type="button"
          disabled={disabled || !canUpload}
          onClick={() => inputRef.current?.click()}
          className="flex h-14 w-full items-center justify-center rounded-[4px] border-[1.5px] border-dashed border-[#d1d5db] bg-white px-3 text-center text-[12px] text-[#6b7280] transition-colors hover:border-[#9ca3af] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {emptyText}
        </button>
      ) : (
        <div className="space-y-1.5">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-stretch overflow-hidden rounded-[4px]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-1.5 bg-[#d1fae5] px-2.5 py-[6px]">
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-[#059669]"
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
                <span className="truncate text-[12px] font-medium text-[#065f46]">
                  {file.name} ({file.size})
                </span>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemove?.(index)}
                  aria-label="ลบไฟล์"
                  className="flex w-8 shrink-0 items-center justify-center bg-[#ef4444] text-white transition-colors hover:bg-[#dc2626]"
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
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handlePick}
        className="hidden"
        tabIndex={-1}
      />
    </div>
  );
}
