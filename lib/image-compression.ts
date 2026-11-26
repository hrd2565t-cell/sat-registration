import type { FileItem } from "@/components/ui/file-upload";

export type ImageCompressionPreset = "photo" | "document";

const PRESET_CONFIG: Record<
  ImageCompressionPreset,
  { maxWidth: number; maxHeight: number; quality: number; orientationAware: boolean }
> = {
  photo: {
    maxWidth: 600,
    maxHeight: 800,
    quality: 0.85,
    orientationAware: false,
  },
  document: {
    maxWidth: 1600,
    maxHeight: 2200,
    quality: 0.82,
    orientationAware: true,
  },
};

export function estimateDataUrlBytes(dataUrl: string): number {
  if (!dataUrl || !dataUrl.includes(",")) return 0;
  const base64Part = dataUrl.split(",")[1] || "";
  if (!base64Part) return 0;
  const paddingMatch = base64Part.match(/=+$/);
  const padding = paddingMatch ? paddingMatch[0].length : 0;
  return Math.max(0, Math.floor((base64Part.length * 3) / 4) - padding);
}

export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "1 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function shouldCompressImageDataUrl(
  dataUrl: string | null | undefined
): boolean {
  if (!dataUrl || typeof dataUrl !== "string") return false;
  return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(dataUrl.trim());
}

export function computeTargetDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number,
  orientationAware = false
): { width: number; height: number; resized: boolean } {
  const safeW = Math.max(1, Math.round(naturalWidth));
  const safeH = Math.max(1, Math.round(naturalHeight));

  let effMaxW = maxWidth;
  let effMaxH = maxHeight;
  if (orientationAware && safeW > safeH && maxHeight > maxWidth) {
    effMaxW = maxHeight;
    effMaxH = maxWidth;
  }

  const scale = Math.min(1, effMaxW / safeW, effMaxH / safeH);
  return {
    width: Math.max(1, Math.round(safeW * scale)),
    height: Math.max(1, Math.round(safeH * scale)),
    resized: scale < 1,
  };
}

function normalizeCompressedFileName(name: string): string {
  return name.replace(/\.(png|webp|jpeg|jpg)$/i, ".jpg");
}

/**
 * Automatically resizes and compresses raster images (JPG/PNG/WEBP) using an HTML Canvas
 * while leaving PDF files and already-hosted Supabase Storage references untouched.
 */
export async function compressImageFile(
  file: FileItem,
  preset: ImageCompressionPreset = "document"
): Promise<FileItem> {
  if (
    typeof window === "undefined" ||
    file.storagePath ||
    !shouldCompressImageDataUrl(file.dataUrl)
  ) {
    return file;
  }

  const config = PRESET_CONFIG[preset];
  const originalDataUrl = file.dataUrl!;
  const originalBytes = estimateDataUrlBytes(originalDataUrl);

  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      try {
        const { width, height, resized } = computeTargetDimensions(
          img.naturalWidth,
          img.naturalHeight,
          config.maxWidth,
          config.maxHeight,
          config.orientationAware
        );

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", config.quality);
        const compressedBytes = estimateDataUrlBytes(compressedDataUrl);

        if (!resized && compressedBytes >= originalBytes && originalBytes > 0) {
          resolve(file);
          return;
        }

        const effectiveBytes =
          compressedBytes > 0 ? compressedBytes : originalBytes;
        resolve({
          ...file,
          name: normalizeCompressedFileName(file.name),
          dataUrl: compressedDataUrl,
          size: formatByteSize(effectiveBytes),
          type: "image/jpeg",
        });
      } catch {
        resolve(file);
      }
    };
    img.onerror = () => resolve(file);
    img.src = originalDataUrl;
  });
}
