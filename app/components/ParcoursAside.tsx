"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { JourneySummary } from "../lib/types";
import { useApi } from "../lib/useApi";
import { AsideItem } from "./Shell";

// Un groupe par valeur de `group` (Prêts, Comptes bancaires...), replie par defaut, ouvert
// automatiquement quand la page active s'y trouve. Meme disclosure native (<details>) que le
// reste du site. Ecrit a la main plutot qu'avec AsideGroup : celui-ci enveloppe ses enfants
// dans un <ul>, incompatible avec des <details> en enfants directs.
function ParcoursGroup({ title, items, activeCode }: { title: string; items: JourneySummary[]; activeCode: string }) {
  const isOpen = items.some((p) => p.code === activeCode);
  return (
    <details className="group/nav" open={isOpen}>
      <summary className="flex items-center w-full text-left py-1.5 text-sm cursor-pointer select-none text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-faint mr-2 transition-transform group-open/nav:rotate-90 shrink-0" aria-hidden="true">
          ›
        </span>
        <span>{title}</span>
      </summary>
      <ul className="ml-4 border-l border-rule pl-2">
        {items.map((p) => (
          <AsideItem key={p.code} href={`/parcours/?code=${p.code}`} active={p.code === activeCode}>
            {p.name}
          </AsideItem>
        ))}
      </ul>
    </details>
  );
}

function ParcoursNav() {
  const activeCode = useSearchParams().get("code") ?? "";
  const { data } = useApi<{ journeys: JourneySummary[] }>("/docs/journeys");
  const journeys = data?.journeys ?? [];

  const groupOrder: string[] = [];
  const byGroup = new Map<string, JourneySummary[]>();
  for (const p of journeys) {
    if (!byGroup.has(p.group)) {
      byGroup.set(p.group, []);
      groupOrder.push(p.group);
    }
    byGroup.get(p.group)!.push(p);
  }

  return (
    <div className="mb-7">
      <div className="label mb-2">Parcours</div>
      <div className="space-y-0.5">
        {groupOrder.map((group) => (
          <ParcoursGroup key={group} title={group} items={byGroup.get(group)!} activeCode={activeCode} />
        ))}
      </div>
    </div>
  );
}

export default function ParcoursAside() {
  return (
    <Suspense>
      <ParcoursNav />
    </Suspense>
  );
}
