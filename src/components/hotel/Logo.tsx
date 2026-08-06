import logoAsset from "@/assets/swissotel-quito-logo.png.asset.json";
import { cn } from "@/lib/utils";

/**
 * Marca corporativa Swissôtel Quito.
 * El original viene sobre fondo claro, por lo que se presenta en una placa
 * clara con borde dorado sutil para mantener legibilidad sobre grafito.
 */
export function Logo({ className, alt = "Swissôtel Quito · Hotels & Resorts" }: { className?: string; alt?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-md border border-primary/30 bg-foreground/95 px-3 py-1.5",
        className,
      )}
    >
      <img src={logoAsset.url} alt={alt} className="h-full w-auto object-contain" loading="lazy" />
    </span>
  );
}
