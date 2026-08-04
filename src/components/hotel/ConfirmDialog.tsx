import { useState, type ReactNode } from "react";

export function ConfirmDialog({
  titulo,
  descripcion,
  trigger,
  onConfirm,
  confirmLabel = "Confirmar",
}: {
  titulo: string;
  descripcion?: string;
  trigger: ReactNode;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <span onClick={() => setAbierto(true)} className="contents">
        {trigger}
      </span>
      {abierto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="surface w-full max-w-md p-6">
            <h2 className="font-display text-xl">{titulo}</h2>
            {descripcion ? (
              <p className="mt-2 text-sm text-muted-foreground">{descripcion}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-border px-4 py-2 text-sm"
                onClick={() => setAbierto(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-gold hover:btn-gold-hover px-4 py-2 text-sm"
                onClick={() => {
                  onConfirm();
                  setAbierto(false);
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
