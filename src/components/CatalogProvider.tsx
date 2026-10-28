import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CASAS } from '../data/casas';
import { fetchCatalog } from '../lib/datos';
import type { House } from '../lib/catalog';

/* Catálogo de casas del sitio: datos ficticios de src/data/casas.ts, leídos con una carga simulada. */
interface CatalogState {
  houses: House[];
  bySlug: Record<string, House>;
  /** true mientras se «carga» el catálogo */
  loading: boolean;
}

const CatalogContext = createContext<CatalogState | null>(null);

const index = (houses: House[]) => Object.fromEntries(houses.map((h) => [h.slug, h]));

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [houses, setHouses] = useState<House[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetchCatalog().then((list) => alive && setHouses(list), () => alive && setHouses([]));
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<CatalogState>(() => {
    const loading = houses === null;
    // Por slug siempre hay datos (portada, formularios y enlaces guardados)
    return { houses: houses ?? [], bySlug: index(houses ?? CASAS), loading };
  }, [houses]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogState {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog fuera de CatalogProvider');
  return ctx;
}
