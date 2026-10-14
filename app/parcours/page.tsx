"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import LoadState from "../components/LoadState";
import ParcoursAside from "../components/ParcoursAside";
import ParcoursView from "../components/ParcoursView";
import Shell from "../components/Shell";
import { JourneyDocSkeleton, ListSkeleton } from "../components/Skeleton";
import type { Journey, JourneySummary } from "../lib/types";
import { useApi } from "../lib/useApi";

// Une seule page pour la liste et pour chaque parcours (/parcours/?code=mes-prets) : le
// site est genere a l'avance et ne connait pas la liste des parcours, qui vient d'Odoo.
export default function ParcoursPage() {
  return (
    <Suspense>
      <ParcoursRoute />
    </Suspense>
  );
}

function ParcoursRoute() {
  const code = useSearchParams().get("code");
  return <Shell aside={<ParcoursAside />}>{code ? <JourneyDetail code={code} /> : <JourneyIndex />}</Shell>;
}

function JourneyIndex() {
  const { data, error, loading } = useApi<{ journeys: JourneySummary[] }>("/docs/journeys");
  return (
    <>
      <div className="mb-6 rounded-lg bg-blue-50 px-5 py-4">
        <h1 className="text-2xl font-semibold text-blue-900">Parcours</h1>
        <p className="text-blue-800 mt-1 max-w-prose">
          Les processus qui enchaînent plusieurs écrans et plusieurs appels, décrits tels que l&apos;utilisateur les vit, avec
          les contraintes à appliquer côté application et les cas de test à jouer. Seuls les processus réellement complexes
          sont décrits ici ; les autres tiennent dans leur fiche de service.
        </p>
      </div>
      <LoadState loading={loading} error={error} skeleton={<ListSkeleton />} />
      {data && (
        <ul className="bg-surface border border-rule rounded-lg shadow-sm overflow-hidden">
          {data.journeys.map((p) => (
            <li key={p.code} className="border-t border-rule first:border-t-0">
              <Link href={`/parcours/?code=${p.code}`} className="block px-5 py-5 group hover:bg-gray-50 transition-colors">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <h2 className="text-lg font-semibold text-ink group-hover:text-accent transition-colors">{p.name}</h2>
                  <span className="font-mono text-xs text-muted">{p.step_count} étapes</span>
                </div>
                <p className="text-sm text-ink mt-2 max-w-prose">{p.audience}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function JourneyDetail({ code }: { code: string }) {
  const { data, error, loading } = useApi<{ journey: Journey }>(`/docs/journeys/${encodeURIComponent(code)}`);
  return (
    <>
      <nav className="label mb-4" aria-label="Fil d'Ariane">
        <Link href="/parcours/" className="hover:text-ink">
          Parcours
        </Link>
        {data && (
          <>
            <span className="mx-2">/</span>
            <span className="text-ink">{data.journey.name}</span>
          </>
        )}
      </nav>
      <LoadState loading={loading} error={error} skeleton={<JourneyDocSkeleton />} />
      {data && <ParcoursView journey={data.journey} />}
    </>
  );
}
