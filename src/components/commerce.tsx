import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { discount, taka } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function Price({
  price,
  compareAt,
  size = "sm",
}: {
  price: number;
  compareAt?: number;
  size?: "sm" | "lg";
}) {
  const cut = discount(price, compareAt);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0 tabular-nums">
      <span className={size === "lg" ? "font-serif text-4xl leading-none" : "text-sm"}>
        {taka(price)}
      </span>
      {cut > 0 && compareAt ? (
        <span className="text-xs text-mute line-through">{taka(compareAt)}</span>
      ) : null}
      {cut > 0 ? <span className="text-xs text-brick">−{cut}%</span> : null}
    </p>
  );
}

export function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-mute">
      <span className="inline-flex" aria-label={`${value} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn(
              "size-3.5",
              i < Math.round(value) ? "fill-gold text-gold" : "text-line",
            )}
            aria-hidden
          />
        ))}
      </span>
      <span className="tabular-nums">
        {value.toFixed(1)}
        {typeof count === "number" ? ` · ${count}` : ""}
      </span>
    </span>
  );
}

export function DealClock() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const key = "raya-deal-end";
    let end = Number(sessionStorage.getItem(key));
    if (!end || Number.isNaN(end) || end < Date.now()) {
      end = Date.now() + 1000 * 60 * 60 * 14;
      sessionStorage.setItem(key, String(end));
    }
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setLabel(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return <span className="tabular-nums">{label ?? "tonight"}</span>;
}

export function Qty({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="inline-flex h-11 items-center border border-line">
      <button
        type="button"
        className="h-11 w-11 text-lg text-ink"
        aria-label="Decrease quantity"
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className="w-8 text-center text-sm tabular-nums">{value}</span>
      <button
        type="button"
        className="h-11 w-11 text-lg text-ink"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(8, value + 1))}
      >
        +
      </button>
    </div>
  );
}
