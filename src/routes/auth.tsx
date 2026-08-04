import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceso al personal · Palacio Aurum" },
      {
        name: "description",
        content:
          "Inicia sesión con tu cuenta corporativa para acceder a incidencias, turnos, comunicados y alertas VIP del hotel.",
      },
      { property: "og:title", content: "Acceso al personal · Palacio Aurum" },
      {
        property: "og:description",
        content: "Acceso seguro a la plataforma de comunicación interna del hotel.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "registro" | "recuperar">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (modo === "registro") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nombre },
          },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Ya puedes iniciar sesión.");
        setModo("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Te enviamos un correo para restablecer tu contraseña.");
        setModo("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No fue posible completar la operación");
    } finally {
      setCargando(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("No fue posible iniciar sesión con Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="surface w-full max-w-md p-8">
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Palacio Aurum</p>
        <h1 className="mt-3 font-display text-3xl">
          {modo === "login" ? "Acceso al personal" : modo === "registro" ? "Crear cuenta" : "Recuperar acceso"}
        </h1>
        <div className="gold-rule mt-4 w-20" />

        <form onSubmit={enviar} className="mt-6 space-y-4">
          {modo === "registro" ? (
            <div>
              <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Nombre completo</label>
              <input className="field mt-1" value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={80} />
            </div>
          ) : null}
          <div>
            <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Correo corporativo</label>
            <input
              type="email"
              className="field mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
            />
          </div>
          {modo !== "recuperar" ? (
            <div>
              <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Contraseña</label>
              <input
                type="password"
                className="field mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={72}
              />
            </div>
          ) : null}
          <button type="submit" disabled={cargando} className="btn-gold hover:btn-gold-hover w-full px-4 py-3 text-sm disabled:opacity-60">
            {cargando ? "Procesando…" : modo === "login" ? "Entrar" : modo === "registro" ? "Registrarme" : "Enviar enlace"}
          </button>
        </form>

        {modo !== "recuperar" ? (
          <>
            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              onClick={google}
              className="w-full rounded-md border border-border px-4 py-3 text-sm hover:border-primary/50 hover:text-primary"
            >
              Continuar con Google
            </button>
          </>
        ) : null}

        <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
          {modo !== "login" ? (
            <button type="button" className="underline" onClick={() => setModo("login")}>
              Ya tengo cuenta
            </button>
          ) : (
            <>
              <button type="button" className="block w-full underline" onClick={() => setModo("registro")}>
                Crear una cuenta nueva
              </button>
              <button type="button" className="block w-full underline" onClick={() => setModo("recuperar")}>
                Olvidé mi contraseña
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
