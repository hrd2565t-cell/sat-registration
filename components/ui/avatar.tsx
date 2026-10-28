import Image from "next/image";

interface AvatarProps {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "portrait";
  className?: string;
}

export function Avatar({ src, alt, size = "md", className }: AvatarProps) {
  const sizes = {
    sm: "w-16 h-20",
    md: "w-24 h-32",
    lg: "w-32 h-40",
    portrait: "w-[76px] h-[92px]",
  };

  const isDataUrl = typeof src === "string" && (src.startsWith("data:") || src.startsWith("blob:"));

  return (
    <div className={`relative shrink-0 ${sizes[size]} ${className || ""}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized={isDataUrl}
          className="rounded-[4px] border border-[#d1d5db] object-cover"
          sizes="(max-width: 768px) 76px, 76px"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-[4px] border-2 border-dashed border-[#d1d5db] bg-[#f3f4f6] text-[10px] font-medium text-[#9ca3af]">
          ไม่มีรูป
        </div>
      )}
    </div>
  );
}
