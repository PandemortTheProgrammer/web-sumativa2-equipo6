import { useCallback, useSyncExternalStore } from 'react';
import { useToast } from '../components/Toasts';

/* Favoritos: se recuerdan en este navegador (misma clave que el sitio original). */
const KEY = 'zugar-favoritos';
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
let snapshot = read();

function write(list: string[]) {
  snapshot = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* sin almacenamiento: solo dura esta visita */
  }
  listeners.forEach((l) => l());
}

export function useFavorites() {
  const toast = useToast();
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
  );
  const toggle = useCallback(
    (name: string, on: boolean) => {
      write([...snapshot.filter((n) => n !== name), ...(on ? [name] : [])]);
      toast(on ? `${name} se guardó en tus favoritos.` : `${name} se quitó de tus favoritos.`);
    },
    [toast],
  );
  return { isFavorite: (name: string) => list.includes(name), toggle };
}
