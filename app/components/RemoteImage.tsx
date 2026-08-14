"use client";

import { useEffect, useRef, useState } from "react";

export default function RemoteImage({
  src,
  alt,
  fallbackSrc,
  fallbackText,
  className = "",
  loading,
}: {
  src: string;
  alt: string;
  fallbackSrc?: string;
  fallbackText: string;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed) {
    return (
      <span className={`remote-image remote-image-fallback ${className}`} role="img" aria-label={alt}>
        {fallbackSrc ? <img src={fallbackSrc} alt="" /> : <b>{fallbackText.slice(0, 2).toUpperCase()}</b>}
        <small>{fallbackText}</small>
      </span>
    );
  }

  return (
    <span className={`remote-image ${className}`}>
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        loading={loading}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
