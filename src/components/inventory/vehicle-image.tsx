"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";

type VehicleImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

export function VehicleImage({ src, alt, className = "", loading }: VehicleImageProps) {
  const normalizedSrc = src?.trim() ?? "";
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !normalizedSrc || failedSrc === normalizedSrc;

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} photo unavailable`}
        className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-[#111923] px-4 text-center text-slate-600 ${className}`}
      >
        <ImageOff size={24} aria-hidden="true" />
        <span className="text-[10px] font-black uppercase tracking-[.14em]">Photo unavailable</span>
      </div>
    );
  }

  return (
    // Dealer/provider image hosts are external and dynamic, so this deliberately
    // uses a plain img while still failing closed to an intentional UI state.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={normalizedSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailedSrc(normalizedSrc)}
    />
  );
}
