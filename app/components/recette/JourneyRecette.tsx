"use client";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { AWAITING_TONES, STATUS_FILTERS, countCases, formatDate, recetteHref, rowMark } from "../../lib/recette";
import type { AcceptanceCase, AcceptanceJourney, AcceptanceStep, AcceptanceVersion, CaseLink } from "../../lib/types";
import { useLive } from "../../lib/useLive";
import { useAuth } from "../AuthGate";
import LoadState from "../LoadState";
import { JourneyRecetteSkeleton } from "../Skeleton";
import CasePanel from "./CasePanel";
import Indicators from "./Indicators";
import { ActionButtons, ActionForm, availableActions, useCaseAction, type CaseAction } from "./StatusActions";
import { Button, Dialog, ErrorMessage, Field, StatusPill, TextArea } from "./ui";

type JourneyData = { version: AcceptanceVersion; journey: AcceptanceJourney; steps: AcceptanceStep[] };

const openKey = (code: string) => `nkezefuu-recette-open-${code}`;
// Profils choisis dans le filtre : communs a tous les parcours, pour que le testeur garde
// le compte avec lequel il est connecte en passant d'un parcours a l'autre.
const PROFILES_KEY = "nkezefuu-recette-profiles";

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage indisponible (navigation privee) : la preference vaut pour la visite.
  }
}

// Recette d'un parcours dans une version : ses etapes (venues d'Odoo), depliables, et
// sous chacune ses cas de cette version, avec les actions du profil connecte sur chaque
// ligne. Une version publiee s'affiche en lecture seule.
export default function JourneyRecette({ code, versionId }: { code: string; versionId: string | null }) {
  const { user } = useAuth();
  const isTester = user.roles.includes("tester");
  const isAdmin = user.roles.includes("acceptance_admin");

  const [awaitingFilters, setAwaitingFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [profileFilters, setProfileFilters] = useState<string[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [openCaseId, setOpenCaseId] = useState<number | null>(null);
  const [flagStep, setFlagStep] = useState<AcceptanceStep | null>(null);

  // Etat deplie de chaque etape, par cle : toutes repliees par defaut, sauf celles que
  // l'utilisateur a depliees (retenu dans le navigateur). Sous filtre, un etat a part,
  // ou les etapes qui ont un cas correspondant sont depliees.
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const [filteredOpen, setFilteredOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setChosen(readStored(openKey(code), {}));
  }, [code]);

  useEffect(() => {
    setProfileFilters(readStored(PROFILES_KEY, []));
  }, []);

  const toggleProfile = (profile: string) =>
    setProfileFilters((current) => {
      const next = toggle(current, profile);
      writeStored(PROFILES_KEY, next);
      return next;
    });

  const query = new URLSearchParams();
  if (versionId) query.set("version", versionId);
  if (awaitingFilters.length) query.set("awaiting", awaitingFilters.join(","));
  const statusCodes = STATUS_FILTERS.filter((f) => statusFilters.includes(f.label)).flatMap((f) => f.codes);
  if (statusCodes.length) query.set("status", statusCodes.join(","));
  if (includeArchived) query.set("include_archived", "1");
  const queryString = query.toString();
  const path = `/journeys/${encodeURIComponent(code)}${queryString ? `?${queryString}` : ""}`;

  const { data, error, loading, reload, setData } = useLive<JourneyData>(path);
  // Le profil se filtre ici, sur les cas deja recus. Les profils proposes sont ceux des
  // cas du parcours, plus ceux deja choisis : un profil retenu d'un autre parcours reste
  // visible, pour comprendre pourquoi aucun cas ne s'affiche et pouvoir le retirer.
  const profiles = Array.from(
    new Set([...(data?.steps ?? []).flatMap((step) => step.cases.map((c) => c.user_profile)), ...profileFilters]),
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "fr"));
  const steps = (data?.steps ?? []).map((step) =>
    profileFilters.length ? { ...step, cases: step.cases.filter((c) => profileFilters.includes(c.user_profile)) } : step,
  );
  const visibleSteps = steps.filter((step) => step.cases.length > 0);
  const filtered = awaitingFilters.length > 0 || statusCodes.length > 0 || profileFilters.length > 0;
  const readOnly = data?.version.state.code === "published";
  // Sous filtre, les indicateurs comptent les cas affiches ; sinon ceux du parcours.
  const counters = data && (filtered ? countCases(visibleSteps.flatMap((step) => step.cases)) : data.journey.counters);
  const profileKey = profileFilters.join("|");

  useEffect(() => {
    setFilteredOpen({});
  }, [queryString, profileKey]);

  const isOpen = (step: AcceptanceStep) => (filtered ? (filteredOpen[step.key] ?? true) : (chosen[step.key] ?? false));

  const setOpen = (keys: string[], open: boolean) => {
    const patch = Object.fromEntries(keys.map((key) => [key, open]));
    if (filtered) {
      setFilteredOpen((current) => ({ ...current, ...patch }));
    } else {
      setChosen((current) => {
        const next = { ...current, ...patch };
        writeStored(openKey(code), next);
        return next;
      });
    }
  };

  // Le cas renvoye par l'action remplace la ligne ; la relecture discrete met a jour les
  // compteurs et retire la ligne si elle ne correspond plus aux filtres.
  const replaceCase = (updated: AcceptanceCase) => {
    setData((current) =>
      current && {
        ...current,
        steps: current.steps.map((step) => ({
          ...step,
          cases: step.cases.map((c) => (c.id === updated.id ? { ...updated, history: undefined } : c)),
        })),
      },
    );
    reload({ quiet: true });
  };

  return (
    <>
      <nav className="label mb-4" aria-label="Fil d'Ariane">
        <Link href={recetteHref(versionId)} className="hover:text-ink">
          Recette
        </Link>
        {data && (
          <>
            <span className="mx-2">/</span>
            <span className="text-ink">{data.journey.name}</span>
          </>
        )}
      </nav>

      {!data && <LoadState loading={loading} error={error} skeleton={<JourneyRecetteSkeleton />} />}

      {data && (
        <div className="space-y-6">
          <header className="rounded-lg bg-blue-50 px-5 py-4 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h1 className="text-2xl font-semibold text-blue-900">Recette du parcours « {data.journey.name} »</h1>
              <Link href={`/parcours/?code=${data.journey.code}`} className="text-sm text-accent hover:text-accent-ink">
                Voir le parcours ›
              </Link>
            </div>
            <VersionLine version={data.version} />
          </header>

          <section className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm" aria-label="Filtres">
            {!readOnly && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted mr-1">Action attendue de</span>
                {AWAITING_FILTERS.map((filter) => (
                  <FilterChip
                    key={filter.code}
                    active={awaitingFilters.includes(filter.code)}
                    onClick={() => setAwaitingFilters((current) => toggle(current, filter.code))}
                  >
                    {filter.label}
                  </FilterChip>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted mr-1">Statut</span>
              {STATUS_FILTERS.map((filter) => (
                <FilterChip
                  key={filter.label}
                  active={statusFilters.includes(filter.label)}
                  onClick={() => setStatusFilters((current) => toggle(current, filter.label))}
                >
                  {filter.label}
                </FilterChip>
              ))}
            </div>
            {profiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted mr-1">Profil</span>
                {profiles.map((profile) => (
                  <FilterChip key={profile} active={profileFilters.includes(profile)} onClick={() => toggleProfile(profile)}>
                    {profile}
                  </FilterChip>
                ))}
              </div>
            )}
            {isAdmin && (
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
                Afficher les cas archivés
              </label>
            )}
          </section>

          {counters && (
            <div className="space-y-1">
              {filtered && <p className="text-xs text-muted">Indicateurs des cas filtrés</p>}
              <Indicators counters={counters} compact />
            </div>
          )}

          {error && <ErrorMessage message={error} />}

          <div className={`space-y-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {visibleSteps.length === 0 ? (
              <p className="text-muted">
                {filtered ? "Aucun cas ne correspond à ces filtres." : `Aucun cas de ce parcours dans la version ${data.version.number}.`}
              </p>
            ) : (
              <div className="flex justify-end gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => setOpen(visibleSteps.map((s) => s.key), true)}
                  className="text-accent hover:text-accent-ink cursor-pointer"
                >
                  Tout déplier
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(visibleSteps.map((s) => s.key), false)}
                  className="text-accent hover:text-accent-ink cursor-pointer"
                >
                  Tout replier
                </button>
              </div>
            )}

            {visibleSteps.map((step) => (
              <StepSection
                key={step.id}
                step={step}
                open={isOpen(step)}
                onToggle={() => setOpen([step.key], !isOpen(step))}
                canFlag={!readOnly && isTester && step.cases.some((c) => c.active && c.result.code === "not_tested")}
                // Le signalement porte sur tous les cas non testes de l'etape, quel que soit le profil filtre
                onFlag={() => setFlagStep(data.steps.find((s) => s.id === step.id) ?? step)}
                onOpenCase={setOpenCaseId}
                onCaseChanged={replaceCase}
                onRegression={() => reload({ quiet: true })}
              />
            ))}
          </div>
        </div>
      )}

      {openCaseId !== null && data && (
        <CasePanel caseId={openCaseId} steps={data.steps} onClose={() => setOpenCaseId(null)} onChanged={() => reload({ quiet: true })} />
      )}

      {flagStep && (
        <FlagStepDialog
          step={flagStep}
          onClose={() => setFlagStep(null)}
          onDone={() => {
            setFlagStep(null);
            reload({ quiet: true });
          }}
        />
      )}
    </>
  );
}

// Version affichee : en recette, ou publiee et donc en lecture seule.
export function VersionLine({ version }: { version: AcceptanceVersion }) {
  if (version.state.code === "published") {
    return (
      <p className="text-sm text-blue-900">
        <span className="font-mono font-semibold">Version {version.number}</span> · {version.type.label} · publiée le{" "}
        {formatDate(version.published_at)}
        {version.published_by && ` par ${version.published_by.name}`}
        <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-xs text-muted">lecture seule</span>
      </p>
    );
  }
  return (
    <p className="text-sm text-blue-900">
      <span className="font-mono font-semibold">Version {version.number}</span> · {version.type.label} · en recette depuis le{" "}
      {formatDate(version.opened_at)}
    </p>
  );
}

const AWAITING_FILTERS = [
  { code: "tester", label: "Testeur" },
  { code: "developer", label: "Développeur" },
];

const toggle = (values: string[], value: string) =>
  values.includes(value) ? values.filter((v) => v !== value) : [...values, value];

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-0.5 text-xs border cursor-pointer transition-colors ${
        active ? "bg-indigo-600 border-indigo-600 text-white" : "bg-surface border-rule text-ink hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Une etape : bandeau cliquable avec son resume, puis le tableau de ses cas
// ---------------------------------------------------------------------------

function StepSection({
  step,
  open,
  onToggle,
  canFlag,
  onFlag,
  onOpenCase,
  onCaseChanged,
  onRegression,
}: {
  step: AcceptanceStep;
  open: boolean;
  onToggle: () => void;
  canFlag: boolean;
  onFlag: () => void;
  onOpenCase: (id: number) => void;
  onCaseChanged: (updated: AcceptanceCase) => void;
  onRegression: () => void;
}) {
  const active = step.cases.filter((c) => c.active);
  const tested = active.filter((c) => c.result.code !== "not_tested").length;
  const failing = active.filter((c) => ["failed", "still_failing", "regression"].includes(c.result.code)).length;
  const awaitingTester = active.filter((c) => c.awaiting.code === "tester").length;
  const awaitingDeveloper = active.filter((c) => c.awaiting.code === "developer").length;
  const panelId = `step-${step.id}`;

  return (
    <section className="bg-surface border border-rule rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pr-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-gray-50"
        >
          <span className={`text-muted text-xs transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true">
            ▶
          </span>
          <span className="font-mono text-accent">{step.number}</span>
          <span className="font-semibold text-ink">{step.title}</span>
        </button>
        <div className="flex items-center gap-3 text-xs text-muted whitespace-nowrap">
          <span>
            {tested}/{active.length} testés
          </span>
          {failing > 0 && (
            <span className="text-err">
              · {failing} non conforme{failing > 1 ? "s" : ""}
            </span>
          )}
          {awaitingTester > 0 && <span className="text-accent-ink">· {awaitingTester} en attente du testeur</span>}
          {awaitingDeveloper > 0 && <span className="text-warn">· {awaitingDeveloper} en attente du développeur</span>}
        </div>
      </div>

      {open && (
        <div id={panelId} className="border-t border-rule">
          {canFlag && (
            <div className="px-4 py-2 text-right border-b border-rule">
              <button type="button" onClick={onFlag} className="text-xs text-purple-800 hover:underline cursor-pointer">
                Signaler l&apos;étape comme non implémentée
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Écran</th>
                  <th>Profil utilisateur</th>
                  <th className="w-[24%]">Action à réaliser</th>
                  <th className="w-[24%]">Résultat attendu</th>
                  <th>Statut</th>
                  <th>Action attendue de</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {step.cases.map((c) => (
                  <CaseRow
                    key={c.id}
                    item={c}
                    onOpen={() => onOpenCase(c.id)}
                    onChanged={onCaseChanged}
                    onRegression={onRegression}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Une ligne de cas, avec ses actions
// ---------------------------------------------------------------------------

export function LinkMention({ link, prefix }: { link: CaseLink; prefix: string }) {
  return (
    <span className="block text-xs text-muted mt-1 whitespace-nowrap">
      {prefix} {link.reference} ({link.version})
    </span>
  );
}

const ORIGIN_PREFIX: Record<string, string> = { regression: "Régression de", postponed: "Reporté de" };
const FOLLOWUP_PREFIX: Record<string, string> = { regression: "Régression en", postponed: "Repris en" };

function CaseRow({
  item,
  onOpen,
  onChanged,
  onRegression,
}: {
  item: AcceptanceCase;
  onOpen: () => void;
  onChanged: (updated: AcceptanceCase) => void;
  onRegression: () => void;
}) {
  // Apres un signalement de regression, le nouveau cas vit dans une autre version : la
  // ligne affiche sa reference et un lien vers lui.
  const [created, setCreated] = useState<AcceptanceCase | null>(null);
  const done = (updated: AcceptanceCase, action: CaseAction) => {
    if (action.kind === "regression") {
      setCreated(updated);
      onRegression();
    } else {
      onChanged(updated);
    }
  };
  const state = useCaseAction(item, done);
  const actions = availableActions(item, { includeReset: false });

  return (
    <Fragment>
      <tr
        onClick={onOpen}
        onKeyDown={(e) => e.target === e.currentTarget && (e.key === "Enter" || e.key === " ") && onOpen()}
        tabIndex={0}
        className={`cursor-pointer hover:bg-gray-50 focus:bg-accent-soft focus:outline-none ${item.active ? "" : "opacity-60"}`}
      >
        <td className={`font-mono text-xs text-accent whitespace-nowrap align-top ${rowMark(item.result.code)}`}>
          {item.reference}
          {!item.active && <span className="block text-faint">archivé</span>}
          {item.origin && <LinkMention link={item.origin} prefix={ORIGIN_PREFIX[item.origin.kind.code] ?? ""} />}
          {item.followups.map((f) => (
            <LinkMention key={f.id} link={f} prefix={FOLLOWUP_PREFIX[f.kind.code] ?? ""} />
          ))}
        </td>
        <td className="text-ink align-top">{item.screen}</td>
        <td className="text-ink align-top">{item.user_profile}</td>
        <td className="text-ink align-top">{item.action}</td>
        <td className="text-ink align-top">{item.expected_result}</td>
        <td className="align-top">
          <StatusPill code={item.result.code} label={item.result.label} />
          {/* Debut du resultat observe (ou de la reserve, du motif) : le texte complet est dans la fiche du cas */}
          {item.observed_result && (
            <span className="text-xs text-muted mt-1 max-w-[14rem] break-words line-clamp-2" title={item.observed_result}>
              {item.observed_result}
            </span>
          )}
          {item.fix_status && <span className="block text-xs text-warn mt-1">{item.fix_status.label}</span>}
          {item.capture_count > 0 && (
            <span className="block text-xs text-accent mt-1">
              {item.capture_count} capture{item.capture_count > 1 ? "s" : ""}
            </span>
          )}
        </td>
        <td className={`align-top whitespace-nowrap text-sm ${AWAITING_TONES[item.awaiting.code] ?? ""}`}>{item.awaiting.label}</td>
        <td className="align-top cursor-default" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {actions.length > 0 && <ActionButtons actions={actions} state={state} vertical />}
        </td>
      </tr>

      {(state.form || state.error || created) && (
        <tr className="bg-gray-50">
          <td colSpan={8} className={rowMark(item.result.code)}>
            <div className="max-w-2xl ml-auto space-y-2">
              {created && (
                <p className="text-sm text-ink">
                  Régression enregistrée :{" "}
                  <Link href={recetteHref(created.version.id, created.journey.code)} className="text-accent hover:text-accent-ink">
                    {created.reference} dans la version {created.version.number} ›
                  </Link>
                </p>
              )}
              <ActionForm state={state} id={`quick-${item.id}`} prefix={item.reference} />
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

// ---------------------------------------------------------------------------
// Signaler une etape non implementee
// ---------------------------------------------------------------------------

function FlagStepDialog({ step, onClose, onDone }: { step: AcceptanceStep; onClose: () => void; onDone: () => void }) {
  const [observed, setObserved] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const count = step.cases.filter((c) => c.active && c.result.code === "not_tested").length;

  const submit = async () => {
    if (!observed.trim()) {
      setError("Renseignez le champ « Résultat observé ».");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api(`/steps/${step.id}/not-implemented`, { method: "POST", body: { observed_result: observed.trim() } });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Une erreur est survenue.");
      setPending(false);
    }
  };

  return (
    <Dialog title="Signaler l'étape comme non implémentée" onClose={onClose}>
      <p className="text-sm text-ink">
        <span className="font-mono text-accent mr-1">{step.number}</span> {step.title}
      </p>
      <p className="text-sm text-muted">
        Les {count} cas encore non testés de cette étape passeront en « Non implémenté ». Les cas déjà testés gardent leur
        résultat.
      </p>
      <Field label="Résultat observé" htmlFor="flag-observed" hint="Ce qui manque dans l'application.">
        <TextArea id="flag-observed" value={observed} onChange={(e) => setObserved(e.target.value)} />
      </Field>
      <ErrorMessage message={error} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={submit} disabled={pending}>
          Signaler
        </Button>
      </div>
    </Dialog>
  );
}
