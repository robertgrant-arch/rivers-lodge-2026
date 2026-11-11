import { useEffect, useRef, useState } from "react";

export type CoverVideoSource = {
  /** H.264 MP4 (plays everywhere). */
  mp4: string;
  /** Optional smaller VP9 WebM, offered first to browsers that support it. */
  webm?: string;
  /** Still image shown before playback, if the video can't play, and to reduced-motion visitors. */
  poster: string;
  /** object-position for the video frame (defaults to the poster's position). */
  position?: string;
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
  posterPosition,
}: {
  video: CoverVideoSource;
  alt: string;
  className?: string;
  /** object-position of the playing video. */
  objectPosition?: string;
  /** object-position of the poster/still (it may be framed differently from the video). */
  posterPosition?: string;
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

  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // iOS only autoplays when the element is muted; set the property explicitly
    // (the `muted` attribute alone isn't always reflected) and nudge playback.
    el.muted = true;
    el.defaultMuted = true;
    // Autoplay can start before React attaches onPlaying, so listen directly and
    // also check the current state; reveal the video once frames are advancing.
    const markPlaying = () => { if (!el.paused && el.currentTime > 0) setPlaying(true); };
    el.addEventListener("playing", markPlaying);
    el.addEventListener("timeupdate", markPlaying);
    markPlaying();
    el.play?.().catch(() => { /* autoplay refused: the poster stays visible */ });
    return () => {
      el.removeEventListener("playing", markPlaying);
      el.removeEventListener("timeupdate", markPlaying);
    };
  }, [stillOnly]);

  const stillStyle = { objectPosition: posterPosition ?? objectPosition };
  if (stillOnly) {
    return <img src={video.poster} alt={alt} className={className} style={stillStyle} loading="lazy" decoding="async" />;
  }
  // The poster is drawn as an <img> underneath (with its own framing) and the
  // video fades in over it once frames are playing, so there's no jump.
  return (
    <>
      <img src={video.poster} alt="" aria-hidden="true" className={className} style={stillStyle} decoding="async" />
    <video
      ref={ref}
      className={className}
      style={{ objectPosition, opacity: playing ? 1 : 0, transition: "opacity 600ms ease" }}
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
    </>
  );
}
