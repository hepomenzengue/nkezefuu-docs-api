import Link from "next/link";
import Shell from "../components/Shell";
import ParcoursAside from "../components/ParcoursAside";
import { countSteps, parcoursList } from "../data/parcours";

export default function ParcoursIndex() {
  return (
    <Shell aside={<ParcoursAside />}>
      <div className="mb-6 rounded-lg bg-blue-50 px-5 py-4">
        <h1 className="text-2xl font-semibold text-blue-900">Parcours</h1>
        <p className="text-blue-800 mt-1 max-w-prose">
          Les processus qui enchaînent plusieurs écrans et plusieurs appels, décrits tels que l&apos;utilisateur les vit, avec
          les contraintes à appliquer côté application et les cas de test à jouer. Seuls les processus réellement complexes
          sont décrits ici ; les autres tiennent dans leur fiche endpoint.
        </p>
      </div>
      <ul className="bg-surface border border-rule rounded-lg shadow-sm overflow-hidden">
        {parcoursList.map((p) => (
          <li key={p.slug} className="border-t border-rule first:border-t-0">
            <Link href={`/parcours/${p.slug}/`} className="block px-5 py-5 group hover:bg-gray-50 transition-colors">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 className="text-lg font-semibold text-ink group-hover:text-accent transition-colors">{p.title}</h2>
                <span className="font-mono text-xs text-muted">
                  {countSteps(p.steps)} étapes · {p.testGroups.reduce((n, g) => n + g.cases.length, 0)} cas de test
                </span>
              </div>
              <p className="text-sm text-ink mt-2 max-w-prose">{p.userLine}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
