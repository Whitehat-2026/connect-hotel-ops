import type { ReactNode } from "react";
import { useSesion, type Rol } from "@/hooks/use-sesion";
import { EmptyState } from "./EmptyState";

export function ProtectedRoute({
  roles,
  children,
}: {
  roles: Rol[];
  children: ReactNode;
}) {
  const { tieneRol, isLoading } = useSesion();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Verificando permisos…</p>;
  }

  if (!tieneRol(...roles)) {
    return (
      <EmptyState
        titulo="Acceso restringido"
        descripcion="Tu rol no tiene autorización para consultar esta información confidencial. Contacta a gerencia si necesitas acceso."
      />
    );
  }

  return <>{children}</>;
}
