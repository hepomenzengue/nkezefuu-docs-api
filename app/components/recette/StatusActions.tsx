"use client";
import { useState } from "react";
import { api, ApiError } from "../../lib/api";
import { FIX_STATUS_LABELS, FIX_STATUSES_WITHOUT_TEXT, OBSERVATION_LABELS, RESULT_LABELS, RESULTS_REQUIRING_OBSERVATION, quickTone } from "../../lib/recette";
import type { AcceptanceCase } from "../../lib/types";
import { CapturePicker, usePendingCaptures } from "./Captures";
import { Button, ErrorMessage, TextArea } from "./ui";

// Actions d'un cas sous forme de boutons de statut, communes a la ligne du tableau et
// a la fiche du cas. Un statut qui n'a besoin d'aucun texte s'enregistre au clic ; les
// autres ouvrent une zone de texte avec son bouton Enregistrer, et des captures d'ecran
// possibles. Les boutons proposes suivent les permissions renvoyees par l'API.

// amend : modifier le dernier resultat (texte, captures) sans changer le statut ; son
// code est celui du resultat en cours.
export type CaseAction = { kind: "result" | "reply" | "regression" | "amend"; code: string };

export function availableActions(item: AcceptanceCase, { includeReset }: { includeReset: boolean }): CaseAction[] {
  const p = item.permissions;
  return [
    ...p.allowed_results.filter((code) => includeReset || code !== "not_tested").map((code) => ({ kind: "result" as const, code })),
    ...p.allowed_fix_statuses.map((code) => ({ kind: "reply" as const, code })),
    ...(p.can_report_regression ? [{ kind: "regression" as const, code: "regression" }] : []),
    ...(p.can_amend ? [{ kind: "amend" as const, code: item.result.code }] : []),
  ];
}

export function actionLabel(action: CaseAction): string {
  if (action.kind === "regression") return "Signaler une régression";
  if (action.kind === "amend") return "Modifier";
  if (action.kind === "reply") return FIX_STATUS_LABELS[action.code] ?? action.code;
  if (action.code === "not_tested") return "Remettre à « Non testé »";
  return RESULT_LABELS[action.code] ?? action.code;
}

// Ouvre un formulaire (texte, captures) au lieu d'enregistrer au clic
function opensForm(action: CaseAction): boolean {
  if (action.kind === "regression" || action.kind === "amend") return true;
  if (action.kind === "reply") return !FIX_STATUSES_WITHOUT_TEXT.includes(action.code);
  return RESULTS_REQUIRING_OBSERVATION.includes(action.code);
}

function textLabel(action: CaseAction): string {
  if (action.kind === "reply") return "Réponse au testeur";
  return OBSERVATION_LABELS[action.code] ?? "Résultat observé";
}

const actionTone = (action: CaseAction) =>
  action.kind === "reply" ? "text-warn hover:bg-warn-soft" : action.kind === "amend" ? "text-ink hover:bg-gray-50" : quickTone(action.code);

// Le texte est exige, sauf pour modifier un resultat qui n'en demande pas (Conforme)
const textRequired = (action: CaseAction) =>
  action.kind !== "amend" || RESULTS_REQUIRING_OBSERVATION.includes(action.code);

function body(action: CaseAction, text: string, captures: { name: string; data: string }[]) {
  if (action.kind === "reply") return { fix_status: action.code, reply: text, captures };
  if (action.kind === "regression" || action.kind === "amend") return { observed_result: text, captures };
  return { result: action.code, observed_result: text, captures };
}

const same = (a: CaseAction | null, b: CaseAction) => a?.kind === b.kind && a.code === b.code;

// onDone recoit le cas renvoye par l'API : le cas lui-meme, ou pour une regression le
// nouveau cas cree dans la version en recette.
export function useCaseAction(item: AcceptanceCase, onDone: (updated: AcceptanceCase, action: CaseAction) => void) {
  const [form, setForm] = useState<CaseAction | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const captures = usePendingCaptures();

  const send = async (action: CaseAction, value: string, attached: { name: string; data: string }[] = []) => {
    setPending(true);
    setError(null);
    try {
      const data = await api<{ case: AcceptanceCase }>(`/cases/${item.id}/${action.kind}`, {
        method: "POST",
        body: body(action, value, attached),
      });
      setForm(null);
      setText("");
      captures.clear();
      onDone(data.case, action);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  };

  const choose = (action: CaseAction) => {
    setError(null);
    if (opensForm(action)) {
      setForm(same(form, action) ? null : action);
      // Modifier part du texte actuel
      setText(action.kind === "amend" ? item.observed_result : "");
      captures.clear();
    } else {
      setForm(null);
      send(action, "");
    }
  };

  // Le bouton Enregistrer reste actif : un texte manquant est explique, pas devine.
  const submit = () => {
    if (!form) return;
    if (!text.trim() && textRequired(form)) {
      setError(`Renseignez le champ « ${textLabel(form)} ».`);
      return;
    }
    if (form.kind === "amend" && text.trim() === item.observed_result.trim() && !captures.captures.length) {
      setError("Rien à modifier : changez le texte ou joignez une capture.");
      return;
    }
    send(form, text.trim(), captures.payload);
  };

  const cancel = () => {
    setForm(null);
    setError(null);
    captures.clear();
  };

  return { form, text, setText, error, pending, choose, submit, cancel, captures };
}

export type CaseActionState = ReturnType<typeof useCaseAction>;

export function ActionButtons({ actions, state, vertical = false }: { actions: CaseAction[]; state: CaseActionState; vertical?: boolean }) {
  return (
    <div className={vertical ? "flex flex-col items-stretch gap-1 min-w-[9rem]" : "flex flex-wrap gap-2"}>
      {actions.map((action) => (
        <button
          key={`${action.kind}-${action.code}`}
          type="button"
          onClick={() => state.choose(action)}
          disabled={state.pending}
          aria-pressed={same(state.form, action)}
          className={`font-medium rounded-md border whitespace-nowrap transition-colors cursor-pointer bg-surface disabled:opacity-50 disabled:cursor-wait ${
            vertical ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5"
          } ${actionTone(action)} ${same(state.form, action) ? "border-current" : "border-rule"}`}
        >
          {actionLabel(action)}
        </button>
      ))}
    </div>
  );
}

export function ActionForm({ state, id, prefix }: { state: CaseActionState; id: string; prefix?: string }) {
  if (!state.form && !state.error) return null;
  return (
    <div className="space-y-2" {...(state.form ? state.captures.zoneProps : {})}>
      {state.form && (
        <>
          <label htmlFor={id} className="block text-sm text-ink">
            {prefix && <>{prefix} · </>}
            <span className="font-medium">{actionLabel(state.form)}</span> : {textLabel(state.form).toLowerCase()}
          </label>
          <TextArea id={id} autoFocus value={state.text} onChange={(e) => state.setText(e.target.value)} />
          <CapturePicker state={state.captures} disabled={state.pending} />
        </>
      )}
      <ErrorMessage message={state.error} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={state.cancel}>
          {state.form ? "Annuler" : "Fermer"}
        </Button>
        {state.form && (
          <Button onClick={state.submit} disabled={state.pending}>
            Enregistrer
          </Button>
        )}
      </div>
    </div>
  );
}
