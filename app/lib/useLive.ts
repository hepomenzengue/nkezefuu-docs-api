"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

// Lecture sans cache, pour la recette : les resultats changent pendant la visite.
// La relecture garde l'affichage en place ; loading signale qu'une lecture est en cours,
// sauf avec reload({ quiet: true }), utilise apres une action deja reportee a l'ecran.
// setData permet de remplacer localement un element renvoye par une action.
export function useLive<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [version, setVersion] = useState(0);
  const quiet = useRef(false);

  useEffect(() => {
    if (path === null) return;
    let active = true;
    if (!quiet.current) setLoading(true);
    quiet.current = false;
    api<T>(path)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [path, version]);

  const reload = useCallback((options?: { quiet?: boolean }) => {
    quiet.current = Boolean(options?.quiet);
    setVersion((v) => v + 1);
  }, []);
  return { data, error, loading, reload, setData };
}
