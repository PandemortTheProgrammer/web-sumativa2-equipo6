import { useEffect, useRef, type ReactNode } from 'react';

/** Diálogo modal del sitio (<dialog> nativo): cierra con Esc, con el fondo o con onClose. */
export function Dialog({ open, onClose, labelledBy, children }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      const previous = document.activeElement as HTMLElement | null;
      dlg.showModal();
      return () => previous?.focus();
    }
    if (!open && dlg.open) dlg.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="site-dialog"
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open && <div className="site-dialog__body">{children}</div>}
    </dialog>
  );
}
