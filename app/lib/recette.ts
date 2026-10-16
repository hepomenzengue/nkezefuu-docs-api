// Vocabulaire de la recette cote site : libelles des codes renvoyes par l'API quand il
// faut les proposer avant d'avoir un cas sous la main (filtres, listes de choix), et
// couleurs des statuts. Les libelles des cas eux-memes viennent de l'API.

import type { AcceptanceCase, Counters, Role } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  tester: "Testeur",
  acceptance_admin: "Administrateur de recette",
  mobile_developer: "Développeur mobile",
};

export const RESULT_LABELS: Record<string, string> = {
  not_tested: "Non testé",
  passed: "Conforme",
  passed_with_reserve: "Conforme avec réserve",
  passed_after_fix: "Conforme après correction",
  failed: "Non conforme",
  still_failing: "Toujours non conforme",
  regression: "Régression",
  blocked: "Bloqué",
  not_implemented: "Non implémenté",
  postponed: "Reporté",
};

export const FIX_STATUS_LABELS: Record<string, string> = {
  in_progress: "En cours d'analyse",
  fixed_to_retest: "Corrigé, à retester",
  works_as_intended: "Fonctionnement normal",
  needs_clarification: "Précisions demandées",
};

// Memes regles que le serveur, pour guider la saisie : le serveur reste juge.
// Pour un report, le texte demande est le motif ; pour une conformite avec reserve, la reserve.
export const RESULTS_REQUIRING_OBSERVATION = ["passed_with_reserve", "failed", "still_failing", "regression", "blocked", "not_implemented", "postponed"];
// Libelle du texte porte par un resultat, quand ce n'est pas un resultat observe.
export const OBSERVATION_LABELS: Record<string, string> = {
  postponed: "Motif du report",
  passed_with_reserve: "Réserve",
};
export const FIX_STATUSES_WITHOUT_TEXT = ["in_progress", "fixed_to_retest"];

// Filtre « Statut » de la recette d'un parcours : un choix peut regrouper plusieurs codes.
export const STATUS_FILTERS: { label: string; codes: string[] }[] = [
  { label: "Non testé", codes: ["not_tested"] },
  { label: "Conforme", codes: ["passed", "passed_after_fix"] },
  { label: "Conforme avec réserve", codes: ["passed_with_reserve"] },
  { label: "Non conforme", codes: ["failed", "still_failing"] },
  { label: "Régression", codes: ["regression"] },
  { label: "Bloqué", codes: ["blocked"] },
  { label: "Non implémenté", codes: ["not_implemented"] },
  { label: "Reporté", codes: ["postponed"] },
];

const RESULT_TONES: Record<string, string> = {
  not_tested: "bg-gray-100 text-gray-700",
  passed: "bg-ok-soft text-ok",
  passed_after_fix: "bg-ok-soft text-ok",
  passed_with_reserve: "bg-orange-100 text-orange-800",
  failed: "bg-err-soft text-err",
  still_failing: "bg-err-soft text-err",
  regression: "bg-err-soft text-err",
  blocked: "bg-warn-soft text-warn",
  not_implemented: "bg-purple-100 text-purple-800",
  postponed: "bg-slate-100 text-slate-700",
};

export const resultTone = (code: string) => RESULT_TONES[code] ?? "bg-gray-100 text-gray-700";

// Fine barre sur le bord gauche d'une ligne de cas, de la couleur de son statut ; aucune
// pour « Non testé ». Le fond de la ligne reste blanc.
const ROW_MARKS: Record<string, string> = {
  passed: "shadow-[inset_3px_0_0_var(--ok)]",
  passed_after_fix: "shadow-[inset_3px_0_0_var(--ok)]",
  passed_with_reserve: "shadow-[inset_3px_0_0_#ea580c]",
  failed: "shadow-[inset_3px_0_0_var(--err)]",
  still_failing: "shadow-[inset_3px_0_0_var(--err)]",
  regression: "shadow-[inset_3px_0_0_var(--err)]",
  blocked: "shadow-[inset_3px_0_0_var(--warn)]",
  not_implemented: "shadow-[inset_3px_0_0_#7e22ce]",
  postponed: "shadow-[inset_3px_0_0_#64748b]",
};

export const rowMark = (code: string) => ROW_MARKS[code] ?? "";

// Boutons d'action rapide sur une ligne : contour discret, texte de la couleur du statut.
const QUICK_TONES: Record<string, string> = {
  passed: "text-ok hover:bg-ok-soft",
  passed_after_fix: "text-ok hover:bg-ok-soft",
  passed_with_reserve: "text-orange-800 hover:bg-orange-50",
  failed: "text-err hover:bg-err-soft",
  still_failing: "text-err hover:bg-err-soft",
  regression: "text-err hover:bg-err-soft",
  blocked: "text-warn hover:bg-warn-soft",
  not_implemented: "text-purple-800 hover:bg-purple-50",
  postponed: "text-slate-700 hover:bg-slate-50",
};

export const quickTone = (code: string) => QUICK_TONES[code] ?? "text-ink hover:bg-gray-50";

export const AWAITING_TONES: Record<string, string> = {
  tester: "text-accent-ink",
  developer: "text-warn",
  closed: "text-muted",
};

export function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

// Adresse de la recette : tableau de bord, ou un parcours, dans une version donnee
// (sans version, le serveur choisit celle en recette, sinon la derniere publiee).
export function recetteHref(versionId: number | string | null, code?: string): string {
  const query = new URLSearchParams();
  if (code) query.set("code", code);
  if (versionId) query.set("version", String(versionId));
  const queryString = query.toString();
  return `/recette/${queryString ? `?${queryString}` : ""}`;
}

// Indicateurs d'une liste de cas, avec les memes regroupements que le serveur : sert a
// recompter une recette filtree. Les cas archives ne comptent pas, comme cote serveur.
export function countCases(cases: AcceptanceCase[]): Counters {
  const active = cases.filter((c) => c.active);
  const result = (...codes: string[]) => active.filter((c) => codes.includes(c.result.code)).length;
  return {
    total: active.length,
    not_tested: result("not_tested"),
    passed: result("passed", "passed_after_fix"),
    passed_with_reserve: result("passed_with_reserve"),
    failed: result("failed", "still_failing"),
    regression: result("regression"),
    blocked: result("blocked"),
    not_implemented: result("not_implemented"),
    postponed: result("postponed"),
    awaiting_tester: active.filter((c) => c.awaiting.code === "tester").length,
    awaiting_developer: active.filter((c) => c.awaiting.code === "developer").length,
  };
}
