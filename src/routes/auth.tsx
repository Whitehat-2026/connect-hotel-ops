import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BiometricLogin } from "@/components/hotel/BiometricLogin";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceso al personal · Swissôtel Quito" },
      {
        name: "description",
        content:
          "Acceso seguro a la plataforma interna de Swissôtel Quito mediante verificación biométrica simulada con correo corporativo.",
      },
      { property: "og:title", content: "Acceso al personal · Swissôtel Quito" },
      {
        property: "og:description",
        content: "Ingreso del personal autorizado a la plataforma de comunicación y coordinación operativa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <BiometricLogin />
    </main>
  );
}
