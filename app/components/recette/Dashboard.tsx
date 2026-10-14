"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "../../lib/api";
import { recetteHref } from "../../lib/recette";
import type { AcceptanceJourney, AcceptanceVersion, Counters } from "../../lib/types";
import { useLive } from "../../lib/useLive";
import LoadState from "../LoadState";
import { DashboardSkeleton } from "../Skeleton";
import Indicators, { Progress } from "./Indicators";
import { VersionLine } from "./JourneyRecette";
import { Button, Dialog, ErrorMessage } from "./ui";

type DashboardData = { version: AcceptanceVersion | null; journeys: AcceptanceJourney[]; summary: Counters };
type VersionsData = { versions: AcceptanceVersion[]; default_version_id: number | null };

// Tableau de bord de la recette d'une version (celle en recette par defaut) : la
// synthese, puis une carte par parcours concerne, regroupees comme dans la navigation.
// Une version publiee se consulte en lecture seule.
export default function Dashboard({ versionId }: { versionId: string | null }) {
  const router = useRouter();
  const versions = useLive<VersionsData>("/versions");
  const { data, error, loading, reload } = useLive<DashboardData>(`/journeys${versionId ? `?version=${versionId}` : ""}`);
  const [publishing, setPublishing] = useState(false);

  const groups: { name: string; journeys: AcceptanceJourney[] }[] = [];
  for (const journey of data?.journeys ?? []) {
    const group = groups.find((g) => g.name === journey.group);
    if (group) group.journeys.push(journey);
    else groups.push({ name: journey.group, journeys: [journey] });
  }
  const version = data?.version ?? null;

  return (
    <>
      <div className="mb-6 rounded-lg bg-blue-50 px-5 py-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <h1 className="text-2xl font-semibold text-blue-900">Tableau de bord de la recette</h1>
          {versions.data && versions.data.versions.length > 0 && version && (
            <label className="inline-flex items-center gap-2 text-sm text-blue-900">
              Version
              <select
                value={version.id}
                onChange={(e) => router.push(recetteHref(e.target.value))}
                className="bg-surface border border-rule rounded-md px-2 py-1 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {versions.data.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.number} · {v.state.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {version && <VersionLine version={version} />}
      </div>

      {!data && <LoadState loading={loading} error={error} skeleton={<DashboardSkeleton />} />}

      {data && !version && <p className="text-muted">Aucune version de l&apos;application n&apos;est encore en recette.</p>}

      {data && version && (
        <div className={`space-y-10 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {version.can_publish && <PublishBar version={version} onPublish={() => setPublishing(true)} />}

          <section>
            <h2 className="label mb-3">Synthèse de la version {version.number}</h2>
            <Indicators counters={data.summary} />
          </section>

          {groups.length === 0 && <p className="text-muted">Aucun cas dans cette version.</p>}

          {groups.map((group) => (
            <section key={group.name}>
              <h2 className="label mb-3">{group.name}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {group.journeys.map((journey) => (
                  <article key={journey.code} className="bg-surface border border-rule rounded-lg shadow-sm p-5 space-y-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-lg font-semibold text-ink">{journey.name}</h3>
                      <span className="font-mono text-xs text-muted">{journey.prefix}</span>
                    </div>
                    <Progress counters={journey.counters} />
                    <Indicators counters={journey.counters} compact />
                    <Link
                      href={recetteHref(version.id, journey.code)}
                      className="inline-block text-sm font-medium text-accent hover:text-accent-ink"
                    >
                      Ouvrir la recette ›
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {publishing && version && (
        <PublishDialog
          version={version}
          onClose={() => setPublishing(false)}
          onDone={() => {
            setPublishing(false);
            reload({ quiet: true });
            versions.reload({ quiet: true });
          }}
        />
      )}
    </>
  );
}

// Publication, pour l'administrateur de recette : le bouton n'apparait que si plus aucun
// cas ne bloque ; sinon le nombre de cas bloquants est affiche a sa place.
function PublishBar({ version, onPublish }: { version: AcceptanceVersion; onPublish: () => void }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 bg-surface border border-rule rounded-lg px-5 py-4">
      {version.blocking_count > 0 ? (
        <p className="text-sm text-ink">
          <span className="font-semibold text-warn">{version.blocking_count}</span> cas ne sont ni conformes ni reportés : la
          version {version.number} ne peut pas encore être publiée.
        </p>
      ) : (
        <>
          <p className="text-sm text-ink">Tous les cas sont conformes ou reportés : la version {version.number} peut être publiée.</p>
          <Button onClick={onPublish}>Publier la version {version.number}</Button>
        </>
      )}
    </section>
  );
}

function PublishDialog({ version, onClose, onDone }: { version: AcceptanceVersion; onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await api(`/versions/${version.id}/publish`, { method: "POST" });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Une erreur est survenue.");
      setPending(false);
    }
  };

  return (
    <Dialog title={`Publier la version ${version.number}`} onClose={onClose}>
      <p className="text-sm text-ink">
        La version et ses cas seront figés et consultables en lecture seule. Les cas reportés seront repris dans la version
        suivante.
      </p>
      <ErrorMessage message={error} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={submit} disabled={pending}>
          Publier
        </Button>
      </div>
    </Dialog>
  );
}
