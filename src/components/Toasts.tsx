import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

/* Avisos flotantes del sitio («Casa Ceiba se guardó en tus favoritos.») */
const ToastContext = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, msg }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="site-toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="site-toast">{t.msg}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
