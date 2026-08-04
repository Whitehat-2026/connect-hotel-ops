import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

export type Columna<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T extends { id: string }>({
  columnas,
  filas,
  vacio = "Sin registros",
}: {
  columnas: Columna<T>[];
  filas: T[];
  vacio?: string;
}) {
  if (filas.length === 0) return <EmptyState titulo={vacio} />;

  return (
    <div className="surface overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {columnas.map((c) => (
              <th
                key={c.key}
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((row) => (
            <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/60">
              {columnas.map((c) => (
                <td key={c.key} className={`px-4 py-3 align-top ${c.className ?? ""}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
