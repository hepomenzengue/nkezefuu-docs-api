"use client";
import { useEffect, useState } from "react";
import { cachedGet } from "./api";

export type Loadable<T> = { data: T | null; error: string | null; loading: boolean };

// Lecture d'une route de documentation, gardee en cache le temps de la visite.
// path a null : rien a charger pour l'instant.
export function useApi<T>(path: string | null): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ data: null, error: null, loading: path !== null });

  useEffect(() => {
    if (path === null) return;
    let active = true;
    setState({ data: null, error: null, loading: true });
    cachedGet<T>(path)
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((error: Error) => active && setState({ data: null, error: error.message, loading: false }));
    return () => {
      active = false;
    };
  }, [path]);

  return state;
}
