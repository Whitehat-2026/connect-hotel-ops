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
      className={cn("w-[110px] max-w-[35vw] h-auto shrink-0 object-contain", className)}
    />
  );
}
