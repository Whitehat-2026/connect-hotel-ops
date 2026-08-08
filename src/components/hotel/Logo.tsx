import logoAsset from "@/assets/swissotel-quito-logo.png.asset.json";
import { cn } from "@/lib/utils";

/**
 * Marca corporativa Swissôtel Quito.
 * Se presenta directamente sobre el fondo grafito, sin placa ni tarjeta.
 */
export function Logo({ className, alt = "Swissôtel Quito · Hotels & Resorts" }: { className?: string; alt?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt={alt}
      className={cn("h-9 w-auto shrink-0 object-contain", className)}
      loading="lazy"
    />
  );
}
