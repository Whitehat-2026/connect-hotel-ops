import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Fingerprint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { accesoDemo } from "@/lib/auth-demo.functions";
import { AuthenticationModal, type FaseAuth } from "./AuthenticationModal";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function BiometricLogin() {
  const navigate = useNavigate();
  const acceso = useServerFn(accesoDemo);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [fase, setFase] = useState<FaseAuth | null>(null);
  const [mensaje, setMensaje] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function ingresar() {
    const valor = email.trim();
    if (!valor) {
      setError("Ingrese su correo corporativo para continuar.");
      return;
    }
    if (!EMAIL_RE.test(valor)) {
      setError("Ingrese un correo corporativo válido.");
      return;
    }
    setError("");
    setFase("verificando");
    setMensaje("Verificando identidad...");

    try {
      const { tokenHash } = await acceso({ data: { email: valor } });
      const { error: err } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
      if (err) throw err;
      setFase("verificado");
      setMensaje("✓ Identidad verificada");
      timer.current = setTimeout(() => navigate({ to: "/dashboard", replace: true }), 900);
    } catch {
      setFase("error");
      setMensaje("No fue posible verificar la identidad. Intente nuevamente.");
      timer.current = setTimeout(() => setFase(null), 2200);
    }
  }

  return (
    <>
      <div className="w-full max-w-sm">
        <p className="text-[10px] uppercase tracking-[0.4em] text-primary">Plataforma interna</p>
        <h1 className="mt-4 font-display text-4xl leading-tight">Swissôtel Quito</h1>
        <div className="gold-rule mt-5 w-24" />
        <p className="mt-5 text-sm text-muted-foreground">Acceso seguro a la plataforma interna</p>

        <div className="mt-10">
          <label htmlFor="correo-corporativo" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Correo corporativo
          </label>
          <input
            id="correo-corporativo"
            type="email"
            name="identificador-demo"
            className="field mt-2"
            placeholder="usuario@swissotelquito.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") void ingresar(); }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-form-type="other"
            maxLength={255}
          />
          <p className="mt-2 text-xs text-muted-foreground">Uso exclusivo para personal autorizado.</p>
          {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
        </div>

        <button
          type="button"
          onClick={() => void ingresar()}
          disabled={fase === "verificando"}
          className="btn-gold hover:btn-gold-hover mt-8 flex w-full items-center justify-center gap-3 px-4 py-4 text-sm font-medium disabled:opacity-70"
        >
          <Fingerprint className="h-5 w-5" />
          Ingresar con huella digital
        </button>

        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground/70">
          Verificación biométrica simulada para fines de demostración. La biometría real forma parte del roadmap fase 2.
        </p>
      </div>

      {fase ? <AuthenticationModal fase={fase} mensaje={mensaje} /> : null}
    </>
  );
}
