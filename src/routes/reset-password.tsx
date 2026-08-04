import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Restablecer contraseña · Palacio Aurum" },
      { name: "description", content: "Define una nueva contraseña para tu cuenta del hotel." },
      { property: "og:title", content: "Restablecer contraseña · Palacio Aurum" },
      { property: "og:description", content: "Define una nueva contraseña para tu cuenta del hotel." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password });
    setCargando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={enviar} className="surface w-full max-w-md p-8">
        <h1 className="font-display text-2xl">Nueva contraseña</h1>
        <div className="gold-rule mt-3 w-16" />
        <input
          type="password"
          className="field mt-6"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          maxLength={72}
          required
        />
        <button className="btn-gold hover:btn-gold-hover mt-4 w-full px-4 py-3 text-sm" disabled={cargando}>
          {cargando ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
