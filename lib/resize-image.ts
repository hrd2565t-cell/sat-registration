/**
 * Resize and compress an image file in the browser so it can be stored as a
 * data URL (e.g. in localStorage) without exceeding storage quotas.
 */
export interface ResizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  /** JPEG/WebP quality between 0 and 1. */
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
}

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
    };
    image.src = url;
  });
}

export async function resizeImageFile(
  file: File,
  {
    maxWidth = 960,
    maxHeight = 540,
    quality = 0.82,
    mimeType = "image/jpeg",
  }: ResizeImageOptions = {}
) {
  const image = await loadImage(file);
  const scale = Math.min(
    1,
    maxWidth / image.naturalWidth,
    maxHeight / image.naturalHeight
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("เบราว์เซอร์ไม่รองรับการปรับขนาดรูปภาพ");

  // JPEG has no alpha channel; paint white so transparent PNGs stay clean.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return {
    dataUrl: canvas.toDataURL(mimeType, quality),
    width,
    height,
  };
}

/** Approximate decoded size in bytes of a base64 data URL. */
export function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.round((base64.length * 3) / 4);
}
