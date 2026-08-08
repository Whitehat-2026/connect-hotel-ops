import { Fingerprint, Check } from "lucide-react";

/** Animación elegante de huella digital (simulación visual, no biometría real). */
export function FingerprintAnimation({ verificado = false }: { verificado?: boolean }) {
  return (
    <div className="relative grid h-32 w-32 place-items-center">
      <span
        className={`absolute inset-0 rounded-full border ${
          verificado ? "border-success/50" : "border-primary/25 animate-ping"
        }`}
      />
      <span className={`absolute inset-3 rounded-full border ${verificado ? "border-success/30" : "border-primary/30"}`} />
      <span
        className={`absolute inset-6 rounded-full border ${
          verificado ? "border-success/20" : "border-primary/20 animate-[pulse_2s_ease-in-out_infinite]"
        }`}
      />
      {verificado ? (
        <Check className="h-14 w-14 text-success" strokeWidth={1.4} />
      ) : (
        <Fingerprint
          className="h-14 w-14 text-primary animate-[pulse_1.4s_cubic-bezier(0.4,0,0.6,1)_infinite]"
          strokeWidth={1.3}
        />
      )}
    </div>
  );
}
