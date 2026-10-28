import { useEffect } from 'react';

/** Título de la pestaña (y descripción para buscadores) de cada página */
export function usePageTitle(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
}
