"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Dashboard from "../components/recette/Dashboard";
import JourneyRecette from "../components/recette/JourneyRecette";
import Shell from "../components/Shell";

// Tableau de bord de la recette, ou recette d'un parcours avec ?code=mes-prets, dans la
// version ?version=<id> (par defaut celle en recette) : meme principe que les pages
// Parcours, la liste des parcours et des versions venant d'Odoo.
export default function RecettePage() {
  return (
    <Suspense>
      <RecetteRoute />
    </Suspense>
  );
}

function RecetteRoute() {
  const params = useSearchParams();
  const code = params.get("code");
  const version = params.get("version");
  return <Shell>{code ? <JourneyRecette code={code} versionId={version} /> : <Dashboard versionId={version} />}</Shell>;
}
