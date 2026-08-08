import { Loader2 } from "lucide-react";
import { FingerprintAnimation } from "./FingerprintAnimation";

export type FaseAuth = "verificando" | "verificado" | "error";

export function AuthenticationModal({ fase, mensaje }: { fase: FaseAuth; mensaje: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        className="flex w-full max-w-sm flex-col items-center rounded-lg border border-primary/20 bg-secondary/40 px-8 py-10 text-center"
      >
        <FingerprintAnimation verificado={fase === "verificado"} />
        <p
          className={`mt-6 font-display text-lg ${
            fase === "verificado" ? "text-success" : fase === "error" ? "text-danger" : "text-foreground"
          }`}
        >
          {mensaje}
        </p>
        {fase === "verificando" ? (
          <p className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Procesando de forma segura
          </p>
        ) : null}
      </div>
    </div>
  );
}
