import { useEffect, useRef, useState } from "react";

export type CoverVideoSource = {
  /** H.264 MP4 (plays everywhere). */
  mp4: string;
  /** Optional smaller VP9 WebM, offered first to browsers that support it. */
  webm?: string;
  /** Still image shown before playback, if the video can't play, and to reduced-motion visitors. */
  poster: string;
};

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Silent, looping cover video (autoplay, muted, loop, playsinline) with a poster
 * fallback. Visitors who ask for reduced motion get the poster image only.
 */
export function CoverVideo({
  video,
  alt,
  className,
  objectPosition,
}: {
  video: CoverVideoSource;
  alt: string;
  className?: string;
  objectPosition?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [stillOnly, setStillOnly] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setStillOnly(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // iOS only autoplays when the element is muted; set the property explicitly
    // (the `muted` attribute alone isn't always reflected) and nudge playback.
    el.muted = true;
    el.defaultMuted = true;
    el.play?.().catch(() => { /* autoplay refused: the poster stays visible */ });
  }, [stillOnly]);

  const style = { objectPosition };
  if (stillOnly) {
    return <img src={video.poster} alt={alt} className={className} style={style} loading="lazy" decoding="async" />;
  }
  return (
    <video
      ref={ref}
      className={className}
      style={style}
      poster={video.poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={alt}
      disablePictureInPicture
    >
      {video.webm && <source src={video.webm} type="video/webm" />}
      <source src={video.mp4} type="video/mp4" />
    </video>
  );
}
