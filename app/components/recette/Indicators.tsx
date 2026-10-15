import type { Counters } from "../../lib/types";

// Les indicateurs d'une recette : meme lecture sur le tableau de bord et en tete de la
// recette d'un parcours. L'action attendue (du testeur, du developpeur) est mise en avant.
const ITEMS: { key: keyof Counters; label: string; tone: string }[] = [
  { key: "total", label: "Cas de test", tone: "text-ink" },
  { key: "not_tested", label: "Non testés", tone: "text-gray-600" },
  { key: "passed", label: "Conformes", tone: "text-ok" },
  { key: "passed_with_reserve", label: "Avec réserve", tone: "text-orange-800" },
  { key: "failed", label: "Non conformes", tone: "text-err" },
  { key: "regression", label: "Régressions", tone: "text-err" },
  { key: "blocked", label: "Bloqués", tone: "text-warn" },
  { key: "not_implemented", label: "Non implémentés", tone: "text-purple-800" },
  { key: "postponed", label: "Reportés", tone: "text-slate-700" },
];

export default function Indicators({ counters, compact = false }: { counters: Counters; compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ITEMS.map((item) => (
        <div key={item.key} className={`bg-surface border border-rule rounded-md ${compact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"}`}>
          <div className={`font-mono tabular-nums font-medium ${compact ? "text-base" : "text-xl"} ${item.tone}`}>{counters[item.key]}</div>
          <div className="text-xs text-muted">{item.label}</div>
        </div>
      ))}
      <div className={`bg-accent-soft border border-rule-strong rounded-md ${compact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"}`}>
        <div className={`font-mono tabular-nums font-semibold text-accent-ink ${compact ? "text-base" : "text-xl"}`}>{counters.awaiting_tester}</div>
        <div className="text-xs text-accent-ink">En attente du testeur</div>
      </div>
      <div className={`bg-warn-soft border border-rule rounded-md ${compact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"}`}>
        <div className={`font-mono tabular-nums font-semibold text-warn ${compact ? "text-base" : "text-xl"}`}>{counters.awaiting_developer}</div>
        <div className="text-xs text-warn">En attente du développeur</div>
      </div>
    </div>
  );
}

// Part des cas conformes
export function Progress({ counters }: { counters: Counters }) {
  const ratio = counters.total ? counters.passed / counters.total : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-ok rounded-full" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
      <span className="font-mono text-xs text-muted tabular-nums">{Math.round(ratio * 100)} % conformes</span>
    </div>
  );
}
