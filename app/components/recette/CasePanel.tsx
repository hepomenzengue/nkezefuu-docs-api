"use client";
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../../lib/api";
import { AWAITING_TONES, formatDate } from "../../lib/recette";
import type { AcceptanceCase, AcceptanceStep, CaseLink, HistoryEntry } from "../../lib/types";
import { Bone } from "../Skeleton";
import { ActionButtons, ActionForm, availableActions, useCaseAction } from "./StatusActions";
import { Button, ErrorMessage, Field, Select, StatusPill, TextArea, TextInput } from "./ui";

type CaseResponse = { case: AcceptanceCase };

// Fiche d'un cas, en panneau lateral : sa description, le dernier test, la prise en
// charge du developpeur, les actions permises a ce profil, puis l'historique. Chaque
// action renvoie le cas complet, qui remplace l'affichage ; la liste est relue a cote.
// Apres un signalement de regression, la fiche passe au nouveau cas, cree dans la
// version en recette.
export default function CasePanel({
  caseId,
  steps,
  onClose,
  onChanged,
}: {
  caseId: number;
  steps: AcceptanceStep[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [item, setItem] = useState<AcceptanceCase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setItem(null);
    setError(null);
    api<CaseResponse>(`/cases/${caseId}`)
      .then((data) => active && setItem(data.case))
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [caseId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const replace = (updated: AcceptanceCase) => {
    setItem(updated);
    onChanged();
  };

  // Appel d'une action du cas affiche : le cas renvoye remplace l'affichage.
  const run = async (path: string, body?: unknown) => {
    const data = await api<CaseResponse>(`/cases/${item?.id ?? caseId}/${path}`, { method: "POST", body: body ?? {} });
    replace(data.case);
  };

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/20" onClick={onClose}>
      <aside
        className="h-full w-full max-w-2xl bg-paper shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Fiche du cas de test"
      >
        <div className="sticky top-0 z-10 bg-surface border-b border-rule px-6 py-4 flex items-center justify-between gap-4">
          {item ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-accent">{item.reference}</span>
              <span className="text-sm text-muted font-mono">v{item.version.number}</span>
              <StatusPill code={item.result.code} label={item.result.label} />
              <span className="text-sm text-muted">Itération {item.iteration}</span>
              {!item.active && <span className="text-xs text-faint">archivé</span>}
            </div>
          ) : (
            <Bone className="h-5 w-48" />
          )}
          <button type="button" onClick={onClose} className="text-sm text-muted hover:text-ink cursor-pointer" aria-label="Fermer">
            Fermer ✕
          </button>
        </div>

        <div className="px-6 py-6 space-y-8">
          <ErrorMessage message={error} />
          {!item && !error && (
            <div className="space-y-8" aria-busy="true">
              {[4, 3, 2].map((lines, i) => (
                <div key={i} className="space-y-3">
                  <Bone className="h-3 w-32" />
                  <div className="bg-surface border border-rule rounded-lg p-4 space-y-3">
                    {Array.from({ length: lines }, (_, j) => (
                      <Bone key={j} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {item && (
            <>
              <Section title="Description du cas">
                <Line label="Étape du parcours">
                  <span className="font-mono text-accent mr-1.5">{item.step.number}</span>
                  {item.step.title}
                </Line>
                <Line label="Écran">{item.screen}</Line>
                <Line label="Profil utilisateur">{item.user_profile}</Line>
                <Line label="Action à réaliser">{item.action}</Line>
                <Line label="Résultat attendu">{item.expected_result}</Line>
                {item.origin && (
                  <Line label={item.origin.kind.code === "regression" ? "Régression de" : "Reporté de"}>
                    <CaseLinkText link={item.origin} />
                  </Line>
                )}
                {item.followups.map((f) => (
                  <Line key={f.id} label={f.kind.code === "regression" ? "Régression signalée" : "Repris dans"}>
                    <CaseLinkText link={f} />
                  </Line>
                ))}
              </Section>

              <Section title="Dernier test">
                <Line label="Statut">
                  <StatusPill code={item.result.code} label={item.result.label} />
                </Line>
                {item.observed_result && (
                  <Line label={item.result.code === "postponed" ? "Motif du report" : "Résultat observé"}>{item.observed_result}</Line>
                )}
                {item.tested_by && (
                  <Line label="Testé par">
                    {item.tested_by.name}, le {formatDate(item.tested_at)}
                  </Line>
                )}
                <Line label="Action attendue de">
                  <span className={AWAITING_TONES[item.awaiting.code] ?? ""}>{item.awaiting.label}</span>
                </Line>
              </Section>

              {item.fix_status && (
                <Section title="Prise en charge">
                  <Line label="Statut de correction">{item.fix_status.label}</Line>
                  {item.reply && <Line label="Réponse du développeur">{item.reply}</Line>}
                  {item.replied_by && (
                    <Line label="Par">
                      {item.replied_by.name}, le {formatDate(item.replied_at)}
                    </Line>
                  )}
                </Section>
              )}

              <Actions item={item} steps={steps} run={run} onReplace={replace} />

              <Section title="Historique des échanges">
                <History entries={item.history ?? []} />
              </Section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="label mb-3">{title}</h3>
      <div className="bg-surface border border-rule rounded-lg p-4 space-y-3">{children}</div>
    </section>
  );
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[11rem_minmax(0,1fr)] gap-x-4 gap-y-0.5 text-sm">
      <div className="text-muted">{label}</div>
      <div className="text-ink whitespace-pre-line">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Actions, selon les permissions renvoyees par l'API pour ce profil
// ---------------------------------------------------------------------------

type Run = (path: string, body?: unknown) => Promise<void>;

// Cas d'une autre version : son origine, ou sa reprise.
function CaseLinkText({ link }: { link: CaseLink }) {
  return (
    <span>
      <span className="font-mono">{link.reference}</span>, version {link.version}
    </span>
  );
}

function Actions({
  item,
  steps,
  run,
  onReplace,
}: {
  item: AcceptanceCase;
  steps: AcceptanceStep[];
  run: Run;
  onReplace: (updated: AcceptanceCase) => void;
}) {
  const p = item.permissions;
  // Les formulaires repartent de zero quand l'etat du cas change : les choix permis
  // ne sont plus les memes.
  const state = `${item.id}-${item.result.code}-${item.fix_status?.code ?? ""}-${item.iteration}-${item.active}`;
  const forms: ReactNode[] = [];
  if (availableActions(item, { includeReset: true }).length)
    forms.push(<StatusCard key={`status-${state}`} item={item} onReplace={onReplace} />);
  if (p.can_comment) forms.push(<CommentForm key="comment" run={run} />);
  const admin = p.can_edit || p.can_archive || p.can_restore;
  if (!forms.length && !admin) return null;

  return (
    <section className="space-y-4">
      <h3 className="label">Actions</h3>
      {forms}
      {admin && <AdminActions item={item} steps={steps} run={run} />}
    </section>
  );
}

// Enveloppe commune : erreur de l'API affichee sous le formulaire, bouton bloque pendant l'envoi.
function useSubmit(action: () => Promise<void>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  };
  return { error, pending, submit };
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-surface border border-rule rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      {children}
    </div>
  );
}

// Boutons de statut : un statut sans texte s'enregistre au clic, les autres ouvrent la
// zone de texte. Pour le testeur, le developpeur, et sur une version publiee le seul
// signalement d'une regression.
function StatusCard({ item, onReplace }: { item: AcceptanceCase; onReplace: (updated: AcceptanceCase) => void }) {
  const state = useCaseAction(item, onReplace);
  const p = item.permissions;
  const title = p.can_report_regression
    ? "Régression"
    : p.allowed_results.length && p.allowed_fix_statuses.length
      ? "Statut du cas"
      : p.allowed_results.length
        ? "Enregistrer un résultat"
        : "Répondre";
  return (
    <Card title={title}>
      <ActionButtons actions={availableActions(item, { includeReset: true })} state={state} />
      <ActionForm state={state} id={`panel-${item.id}`} />
    </Card>
  );
}

function CommentForm({ run }: { run: Run }) {
  const [text, setText] = useState("");
  const { error, pending, submit } = useSubmit(async () => {
    await run("comment", { text: text.trim() });
    setText("");
  });
  return (
    <Card title="Ajouter un commentaire">
      <TextArea id="comment-text" aria-label="Commentaire" value={text} onChange={(e) => setText(e.target.value)} />
      <ErrorMessage message={error} />
      <Button variant="secondary" onClick={submit} disabled={pending || !text.trim()}>
        Ajouter
      </Button>
    </Card>
  );
}

function AdminActions({ item, steps, run }: { item: AcceptanceCase; steps: AcceptanceStep[]; run: Run }) {
  const [editing, setEditing] = useState(false);
  const archive = useSubmit(() => run(item.active ? "archive" : "restore"));
  const p = item.permissions;

  return (
    <Card title="Administration du cas">
      {editing ? (
        <EditForm item={item} steps={steps} run={run} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {p.can_edit && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Modifier le cas
            </Button>
          )}
          {p.can_archive && (
            <Button variant="danger" onClick={archive.submit} disabled={archive.pending}>
              Archiver
            </Button>
          )}
          {p.can_restore && (
            <Button variant="secondary" onClick={archive.submit} disabled={archive.pending}>
              Restaurer
            </Button>
          )}
        </div>
      )}
      <ErrorMessage message={archive.error} />
    </Card>
  );
}

function EditForm({ item, steps, run, onDone }: { item: AcceptanceCase; steps: AcceptanceStep[]; run: Run; onDone: () => void }) {
  const [values, setValues] = useState({
    step_id: String(item.step.id),
    screen: item.screen,
    user_profile: item.user_profile,
    action: item.action,
    expected_result: item.expected_result,
  });
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const { error, pending, submit } = useSubmit(async () => {
    await run("update", { ...values, step_id: Number(values.step_id) });
    onDone();
  });
  const complete = values.screen.trim() && values.user_profile.trim() && values.action.trim() && values.expected_result.trim();

  return (
    <div className="space-y-3">
      <Field label="Étape du parcours" htmlFor="edit-step">
        <Select id="edit-step" value={values.step_id} onChange={set("step_id")}>
          {steps.map((step) => (
            <option key={step.id} value={step.id}>
              {step.number} {step.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Écran" htmlFor="edit-screen">
        <TextInput id="edit-screen" value={values.screen} onChange={set("screen")} />
      </Field>
      <Field label="Profil utilisateur" htmlFor="edit-profile">
        <TextInput id="edit-profile" value={values.user_profile} onChange={set("user_profile")} />
      </Field>
      <Field label="Action à réaliser" htmlFor="edit-action">
        <TextArea id="edit-action" value={values.action} onChange={set("action")} />
      </Field>
      <Field label="Résultat attendu" htmlFor="edit-expected">
        <TextArea id="edit-expected" value={values.expected_result} onChange={set("expected_result")} />
      </Field>
      <ErrorMessage message={error} />
      <div className="flex gap-2">
        <Button onClick={submit} disabled={pending || !complete}>
          Enregistrer les modifications
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Historique, regroupe par iteration, de la plus recente a la plus ancienne
// ---------------------------------------------------------------------------

function History({ entries }: { entries: HistoryEntry[] }) {
  if (!entries.length) return <p className="text-sm text-muted">Aucun échange pour le moment.</p>;
  const iterations = [...new Set(entries.map((e) => e.iteration))].sort((a, b) => b - a);
  return (
    <div className="space-y-5">
      {iterations.map((iteration) => (
        <div key={iteration}>
          <div className="text-xs font-medium text-muted mb-2">{iteration === 0 ? "Avant le premier test" : `Itération ${iteration}`}</div>
          <ol className="space-y-3 border-l border-rule pl-4">
            {entries
              .filter((e) => e.iteration === iteration)
              .reverse()
              .map((entry) => (
                <li key={entry.id} className="text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-ink">{entry.type.label}</span>
                    {entry.status && entry.type.code === "result" && <StatusPill code={entry.status.code} label={entry.status.label} />}
                    {entry.status && entry.type.code === "reply" && <span className="text-xs text-warn">{entry.status.label}</span>}
                  </div>
                  {entry.text && <p className="text-ink mt-1 whitespace-pre-line">{entry.text}</p>}
                  <div className="text-xs text-faint mt-1">
                    {entry.author?.name}
                    {entry.date && `, le ${formatDate(entry.date)}`}
                  </div>
                </li>
              ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
