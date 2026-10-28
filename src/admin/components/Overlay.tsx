import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { notify } from '../servicio';
import { Icon } from './ui';

/* ==========================================================================
   Diálogos (dialog nativo: foco atrapado y Escape) y avisos flotantes del panel.
   ========================================================================== */
interface ConfirmOptions {
  icon?: string;
  title: string;
  lead: ReactNode;
  item?: ReactNode;
  callout?: ReactNode;
  /** Casilla que hay que marcar para habilitar el botón */
  check?: string | null;
  confirm: string;
  cancel?: string;
  /** true = acción normal (botón azul); por omisión es peligrosa (rojo) */
  safe?: boolean;
  onConfirm: () => void;
}

interface OverlayApi {
  toast: (msg: string) => void;
  open: (render: (close: () => void) => ReactNode, opts?: { wide?: boolean; confirm?: boolean }) => void;
  close: () => void;
  confirm: (o: ConfirmOptions) => void;
}

const Ctx = createContext<OverlayApi | null>(null);
export const useOverlay = () => useContext(Ctx)!;

function ConfirmBody({ o, close }: { o: ConfirmOptions; close: () => void }) {
  const [checked, setChecked] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelRef.current?.focus(), []);
  return (
    <>
      <span className="dialog__icon"><Icon id={o.icon || 'trash'} className="icon--lg" /></span>
      <h2 id="dialog-title">{o.title}</h2>
      <p className="lead">{o.lead}</p>
      {o.item}
      {o.callout}
      {o.check && (
        <label className="check">
          <input type="checkbox" id="confirm-check" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> {o.check}
        </label>
      )}
      <div className="dialog__actions">
        <button ref={cancelRef} className="btn btn--secondary" type="button" onClick={close}>{o.cancel || 'Cancelar'}</button>
        <button className={'btn' + (o.safe ? '' : ' btn--danger')} type="button" id="confirm-ok" disabled={!!o.check && !checked} onClick={() => { close(); o.onConfirm(); }}>
          {o.confirm}
        </button>
      </div>
    </>
  );
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [dlg, setDlg] = useState<{ render: (close: () => void) => ReactNode; wide?: boolean; confirm?: boolean; key: number } | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { id, msg }]);
    setTimeout(() => setToasts((x) => x.filter((t) => t.id !== id)), 4200);
  }, []);
  notify.toast = toast;

  const close = useCallback(() => ref.current?.open && ref.current.close(), []);
  const open = useCallback<OverlayApi['open']>((render, opts) => {
    lastFocus.current = document.activeElement as HTMLElement;
    setDlg({ render, wide: opts?.wide, confirm: opts?.confirm, key: Date.now() });
  }, []);
  const confirm = useCallback((o: ConfirmOptions) => open((c) => <ConfirmBody o={o} close={c} />, { confirm: true }), [open]);

  useEffect(() => {
    const d = ref.current;
    if (!dlg || !d) return;
    if (!d.open) d.showModal();
    const first = d.querySelector<HTMLElement>('[autofocus]') || d.querySelector<HTMLElement>('input, select, textarea, button:not(.dialog__close)');
    first?.focus();
  }, [dlg]);

  return (
    <Ctx.Provider value={{ toast, open, close, confirm }}>
      {children}
      <dialog
        ref={ref}
        className={[dlg?.wide && 'dialog--wide', dlg?.confirm && 'dialog--confirm'].filter(Boolean).join(' ')}
        aria-labelledby="dialog-title"
        onClose={() => {
          setDlg(null);
          if (lastFocus.current && document.contains(lastFocus.current)) lastFocus.current.focus();
        }}
        onClick={(e) => e.target === ref.current && close()}
      >
        {dlg && (
          <div className="dialog__body" key={dlg.key}>
            {dlg.render(close)}
            <button className="icon-btn dialog__close" type="button" aria-label="Cerrar" onClick={close}><Icon id="x" /></button>
          </div>
        )}
      </dialog>
      <div className="toasts" role="status" aria-live="polite" id="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast"><Icon id="check-c" /><span>{t.msg}</span></div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
