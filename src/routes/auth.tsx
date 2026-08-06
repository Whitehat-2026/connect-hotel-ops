import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Fingerprint, Lock, ShieldCheck, TriangleAlert, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceso biométrico · Swissôtel Quito" },
      {
        name: "description",
        content:
          "Accede a la plataforma del hotel con biometría (huella o rostro) o mediante código único enviado a tu correo registrado.",
      },
      { property: "og:title", content: "Acceso biométrico · Swissôtel Quito" },
      {
        property: "og:description",
        content: "Autenticación biométrica con acceso alternativo por código único al correo corporativo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Estado = "biometria" | "error_biometria" | "codigo_enviado" | "verificando" | "exito";

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [modal, setModal] = useState(false);
  const [estado, setEstado] = useState<Estado>("biometria");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [registro, setRegistro] = useState(false);
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/dashboard", replace: true });
    });
    return () => {
      sub.subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [navigate]);

  function validarEmail(valor: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor);
  }

  async function biometria() {
    if (!validarEmail(email)) {
      toast.error("Ingresa tu correo corporativo registrado");
      return;
    }
    setModal(true);
    setEstado("biometria");
    setMensaje("Coloca tu huella o mira a la cámara para validar tu identidad…");

    let ok = false;
    try {
      const disponible =
        typeof window !== "undefined" &&
        window.PublicKeyCredential &&
        (await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
      if (disponible) {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const cred = await navigator.credentials.get({
          publicKey: { challenge, timeout: 30000, userVerification: "required" },
        });
        ok = Boolean(cred);
      }
    } catch {
      ok = false;
    }

    if (ok) {
      setEstado("verificando");
      setMensaje("Biometría verificada. Confirmando tu sesión con un código único de un solo uso…");
    } else {
      setEstado("error_biometria");
      setMensaje(
        "No pudimos validar tu biometría en este dispositivo. Usa el acceso seguro alternativo con código único enviado a tu correo registrado.",
      );
      return;
    }
    await enviarCodigo();
  }

  async function enviarCodigo() {
    setCargando(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      setEstado("codigo_enviado");
      setMensaje(`Enviamos un código único de 6 dígitos a ${email}. Vence en 10 minutos.`);
    } catch (err) {
      setEstado("error_biometria");
      setMensaje(err instanceof Error ? err.message : "No fue posible enviar el código de acceso.");
    } finally {
      setCargando(false);
    }
  }

  async function verificarCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(codigo.trim())) {
      setMensaje("El código debe tener 6 dígitos numéricos.");
      return;
    }
    setCargando(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: codigo.trim(), type: "email" });
      if (error) throw error;
      setEstado("exito");
      setMensaje("Identidad confirmada. Abriendo tu panel operativo…");
      timer.current = setTimeout(() => navigate({ to: "/dashboard", replace: true }), 900);
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Código inválido o expirado.");
    } finally {
      setCargando(false);
    }
  }

  async function crearCuenta(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { nombre } },
      });
      if (error) throw error;
      toast.success("Cuenta creada. Confirma tu correo y luego accede con biometría.");
      setRegistro(false);
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No fue posible crear la cuenta");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="surface w-full max-w-md p-8">
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Swissôtel Quito</p>
        <h1 className="mt-3 font-display text-3xl">Acceso al personal</h1>
        <div className="gold-rule mt-4 w-20" />
        <p className="mt-4 text-sm text-muted-foreground">
          Autenticación biométrica obligatoria: huella digital o reconocimiento facial del dispositivo asignado.
        </p>

        <div className="mt-6">
          <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Correo corporativo</label>
          <input
            type="email"
            name="correo-acceso"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-form-type="other"
            className="field mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@palacioaurum.com"
            maxLength={255}
          />
        </div>

        <button
          type="button"
          onClick={biometria}
          className="btn-gold hover:btn-gold-hover mt-5 flex w-full items-center justify-center gap-3 px-4 py-4 text-sm font-medium"
        >
          <Fingerprint className="h-5 w-5" />
          Acceder a la plataforma por biometría
        </button>

        <button
          type="button"
          onClick={() => {
            if (!validarEmail(email)) {
              toast.error("Ingresa tu correo corporativo registrado");
              return;
            }
            setModal(true);
            setEstado("verificando");
            setMensaje("Generando tu código único de acceso…");
            void enviarCodigo();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary"
        >
          <Lock className="h-4 w-4" />
          Acceso seguro alternativo (código al correo)
        </button>

        {registro ? (
          <form onSubmit={crearCuenta} className="mt-6 space-y-3 border-t border-border pt-6">
            <input className="field" placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={80} />
            <input
              type="password"
              className="field"
              placeholder="Contraseña de respaldo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={72}
            />
            <button className="w-full rounded-md border border-primary/40 px-4 py-2.5 text-sm text-primary" disabled={cargando}>
              {cargando ? "Registrando…" : "Registrar cuenta"}
            </button>
          </form>
        ) : null}

        <button
          type="button"
          className="mt-6 block w-full text-center text-xs text-muted-foreground underline"
          onClick={() => setRegistro((v) => !v)}
        >
          {registro ? "Cancelar registro" : "Primera vez: registrar cuenta y dispositivo"}
        </button>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="surface w-full max-w-sm p-6" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-full border ${
                    estado === "exito"
                      ? "border-success/40 text-success"
                      : estado === "error_biometria"
                        ? "border-danger/40 text-danger"
                        : "border-primary/40 text-primary"
                  }`}
                >
                  {estado === "exito" ? (
                    <ShieldCheck className="h-5 w-5" />
                  ) : estado === "error_biometria" ? (
                    <TriangleAlert className="h-5 w-5" />
                  ) : estado === "codigo_enviado" ? (
                    <Lock className="h-5 w-5" />
                  ) : (
                    <Fingerprint className="h-5 w-5 animate-pulse" />
                  )}
                </span>
                <h2 className="font-display text-lg">
                  {estado === "exito"
                    ? "Acceso concedido"
                    : estado === "error_biometria"
                      ? "Biometría no validada"
                      : estado === "codigo_enviado"
                        ? "Código único enviado"
                        : "Validando identidad"}
                </h2>
              </div>
              <button type="button" onClick={() => setModal(false)} aria-label="Cerrar" className="text-muted-foreground hover:text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">{mensaje}</p>

            {estado === "error_biometria" ? (
              <button
                type="button"
                onClick={() => {
                  setEstado("verificando");
                  setMensaje("Generando tu código único de acceso…");
                  void enviarCodigo();
                }}
                className="btn-gold hover:btn-gold-hover mt-5 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
                disabled={cargando}
              >
                <Lock className="h-4 w-4" />
                Acceso seguro alternativo
              </button>
            ) : null}

            {estado === "codigo_enviado" ? (
              <form onSubmit={verificarCodigo} className="mt-5 space-y-3">
                <input
                  className="field text-center text-lg tracking-[0.5em]"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="······"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                />
                <button className="btn-gold hover:btn-gold-hover w-full px-4 py-3 text-sm" disabled={cargando}>
                  {cargando ? "Verificando…" : "Confirmar código"}
                </button>
                <button type="button" className="w-full text-xs text-muted-foreground underline" onClick={() => void enviarCodigo()}>
                  Reenviar código
                </button>
              </form>
            ) : null}

            {estado === "verificando" || estado === "biometria" ? (
              <div className="mt-6 flex flex-col items-center gap-4">
                <div className="relative grid h-28 w-28 place-items-center">
                  <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
                  <span className="absolute inset-2 rounded-full border border-primary/30" />
                  <Loader2 className="absolute inset-0 m-auto h-28 w-28 animate-spin text-primary/40" strokeWidth={0.6} />
                  <Fingerprint
                    className="h-12 w-12 text-primary animate-[pulse_1.4s_cubic-bezier(0.4,0,0.6,1)_infinite] drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
                    strokeWidth={1.4}
                  />
                </div>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Procesando de forma segura…
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
