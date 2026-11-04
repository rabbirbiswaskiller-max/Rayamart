import { useRef, useState } from "react";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const count = images.length;
  if (count === 0) return null;

  const go = (n: number) => setIndex((n + count) % count);

  return (
    <div>
      <div
        className="relative aspect-square overflow-hidden bg-paper-2"
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (startX.current === null || count < 2) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        {images.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt={alt}
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      {count > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Image ${i + 1}`}
              aria-current={i === index}
              className={`size-16 shrink-0 overflow-hidden border bg-paper-2 transition-opacity ${
                i === index ? "border-pine" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
