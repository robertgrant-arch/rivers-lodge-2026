import { useCallback, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Picture from "@shared/components/Picture";

import { WEDDING_GALLERY, type WeddingGalleryPhoto as GalleryPhoto } from "../galleryPhotos";

function Lightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: GalleryPhoto[];
  index: number | null;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const open = index !== null;
  const photo = open ? photos[index] : null;

  const prev = useCallback(() => {
    if (index === null) return;
    onIndexChange((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onIndexChange]);
  const next = useCallback(() => {
    if (index === null) return;
    onIndexChange((index + 1) % photos.length);
  }, [index, photos.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, prev, next]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-[#2B2823]/95" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-12 outline-none"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            Wedding gallery photo {index !== null ? index + 1 : ""} of {photos.length}
          </DialogPrimitive.Title>
          {photo && (
            <figure className="flex flex-col items-center max-w-full max-h-full">
              <img
                key={photo.src}
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                className="max-h-[calc(100dvh-8rem)] max-w-full w-auto h-auto object-contain shadow-2xl"
              />
              <figcaption className="mt-4 font-sans text-xs tracking-[0.18em] uppercase text-[#E0D3BD]/80">
                {index! + 1} / {photos.length}
              </figcaption>
            </figure>
          )}
          <DialogPrimitive.Close
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-[#E0D3BD] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E0D3BD] rounded-sm"
            aria-label="Close gallery"
          >
            <X className="w-7 h-7" aria-hidden="true" />
          </DialogPrimitive.Close>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2 text-[#E0D3BD] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E0D3BD] rounded-sm"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-9 h-9" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2 text-[#E0D3BD] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E0D3BD] rounded-sm"
            aria-label="Next photo"
          >
            <ChevronRight className="w-9 h-9" aria-hidden="true" />
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Responsive masonry grid of wedding photos with a full-size lightbox. */
export default function WeddingGallery({ photos = WEDDING_GALLERY }: { photos?: GalleryPhoto[] }) {
  const [index, setIndex] = useState<number | null>(null);

  return (
    <>
      <ul className="columns-1 sm:columns-2 lg:columns-3 gap-4 lg:gap-6 [&>li]:mb-4 lg:[&>li]:mb-6" aria-label="Wedding photo gallery">
        {photos.map((p, i) => (
          <li key={p.src} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group block w-full overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#576276]"
              aria-label={`View larger: ${p.alt}`}
            >
              <Picture
                src={p.src}
                alt={p.alt}
                width={p.width}
                height={p.height}
                className="relative w-full overflow-hidden"
                imgClassName="block w-full h-auto transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                loading="lazy"
              />
            </button>
          </li>
        ))}
      </ul>
      <Lightbox photos={photos} index={index} onIndexChange={setIndex} onClose={() => setIndex(null)} />
    </>
  );
}
