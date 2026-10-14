import type { ReactNode } from "react";
import { TextSkeleton } from "./Skeleton";

// Affichage commun pendant une lecture de l'API (squelette de la page attendue), ou
// quand elle echoue.
export default function LoadState({ loading, error, skeleton }: { loading: boolean; error: string | null; skeleton?: ReactNode }) {
  if (loading) return <>{skeleton ?? <TextSkeleton />}</>;
  if (error)
    return (
      <p role="alert" className="text-sm text-err bg-err-soft rounded-md px-4 py-3">
        {error}
      </p>
    );
  return null;
}
