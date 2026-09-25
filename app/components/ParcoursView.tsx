"use client";
import Link from "next/link";
import { allEndpoints } from "../data";
import type { Parcours, RuleRow, ScreenField, Step, StepBlock } from "../data/parcours";

const endpointById = new Map(allEndpoints.map((e) => [e.id, e]));

const stepAnchor = (num: string) => `s${num.replace(/\./g, "-")}`;

// Numero de chaque etape portant un ref, pour resoudre les renvois {{ref}} du texte.
function collectRefs(steps: Step[], prefix = ""): Map<string, string> {
  const map = new Map<string, string>();
  steps.forEach((step, i) => {
    const num = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
    if (step.ref) map.set(step.ref, num);
    for (const [k, v] of collectRefs(step.children ?? [], num)) map.set(k, v);
  });
  return map;
}

function collectRuleIds(steps: Step[]): Set<string> {
  const ids = new Set<string>();
  const walk = (list: Step[]) => {
    for (const step of list) {
      for (const block of step.blocks ?? []) {
        if (block.kind === "rules") for (const row of block.rows) ids.add(row.id);
      }
      walk(step.children ?? []);
    }
  };
  walk(steps);
  return ids;
}

function EndpointLink({ id }: { id: string }) {
  const ep = endpointById.get(id);
  if (!ep) return <code className="text-xs">{id}</code>;
  return (
    <Link href={`/#endpoint-${ep.id}`} className="inline-flex items-baseline gap-1.5 text-xs font-mono prose-link" title={ep.summary}>
      <span className={`font-medium ${ep.method === "GET" ? "text-get" : "text-post"}`}>{ep.method}</span>
      <span>{ep.path.replace("/api/auth/", "")}</span>
    </Link>
  );
}

// Reference C4, C5... vers une ligne de tableau plus haut dans la page. Rendue en texte
// simple si l'id n'a pas de ligne (certains cas de test citent C1 ou C13, communs a tous
// les parcours, jamais tabules ici).
function ConstraintRef({ id, known }: { id: string; known: boolean }) {
  const anchor = `c${id.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  if (!known) return <span className="font-mono text-xs text-muted">{id}</span>;
  return (
    <Link href={`#${anchor}`} className="font-mono text-xs prose-link">
      {id}
    </Link>
  );
}

// Phrase de recit : segments `entre backticks` en code, renvois {{ref}} remplaces par le
// numero de l'etape visee, en lien cliquable.
function StepText({ text, refs }: { text: string; refs: Map<string, string> }) {
  const parts = text.split(/(`[^`]+`|\{\{[a-z0-9-]+\}\})/g);
  return (
    <p className="text-ink max-w-prose leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
        if (part.startsWith("{{") && part.endsWith("}}")) {
          const num = refs.get(part.slice(2, -2));
          if (!num) return <span key={i}>{part}</span>;
          return (
            <Link key={i} href={`#${stepAnchor(num)}`} className="font-mono prose-link">
              {num}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

function RulesTable({ title, rows }: { title?: string; rows: RuleRow[] }) {
  const hasField = rows.some((r) => r.field);
  return (
    <div>
      {title && <h3 className="font-semibold text-ink mb-2 text-sm">{title}</h3>}
      <div className="overflow-x-auto border border-rule rounded-lg">
        <table className="ledger">
          <thead>
            <tr>
              <th className="w-12">#</th>
              {hasField && <th className="w-[13%]">Champ</th>}
              <th className="w-[25%]">Règle</th>
              <th className="w-[27%]">Variable de l&apos;API</th>
              <th className="w-[28%]">Contrôle app</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} id={`c${r.id.toLowerCase().replace(/[^a-z0-9]/g, "")}`} className="scroll-mt-6">
                <td className="font-mono text-accent whitespace-nowrap align-top">{r.id}</td>
                {hasField && <td className="text-ink align-top">{r.field}</td>}
                <td className="text-ink align-top">{r.rule}</td>
                <td className="align-top">
                  <code className="text-xs">{r.apiVariable}</code>
                </td>
                <td className="text-ink align-top">{r.appControl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScreenTable({ title, endpointIds, fields, note }: { title: string; endpointIds: string[]; fields: ScreenField[]; note?: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
        <h3 className="font-semibold text-ink text-sm">{title}</h3>
        {endpointIds.map((id) => (
          <EndpointLink key={id} id={id} />
        ))}
      </div>
      {note && <p className="text-sm text-muted mb-2 max-w-prose">{note}</p>}
      <div className="overflow-x-auto border border-rule rounded-lg">
        <table className="ledger">
          <thead>
            <tr>
              <th>Libellé</th>
              <th>Variable de l&apos;API</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.label}>
                <td className="text-ink whitespace-nowrap">{f.label}</td>
                <td>
                  <code className="text-xs">{f.apiVariable}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MockupBlock({ title, html }: { title?: string; html: string }) {
  return (
    <div>
      {title && <h3 className="font-semibold text-ink mb-2 text-sm">{title}</h3>}
      <div className="border border-rule rounded-lg p-4 bg-paper" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function Block({ block }: { block: StepBlock }) {
  if (block.kind === "screen") {
    return <ScreenTable title={block.title} endpointIds={block.endpointIds} fields={block.fields} note={block.note} />;
  }
  if (block.kind === "mockup") {
    return <MockupBlock title={block.title} html={block.html} />;
  }
  return <RulesTable title={block.title} rows={block.rows} />;
}

// Arbre numerote : le numero calcule (1, 2, 2.1, 2.1.1...) tient lieu de puce, les
// tableaux de l'etape viennent juste sous sa phrase, et les sous-etapes sont decalees
// derriere un filet vertical qui materialise la branche.
function StepList({ steps, refs, prefix = "" }: { steps: Step[]; refs: Map<string, string>; prefix?: string }) {
  return (
    <ol className={prefix ? "mt-4 space-y-4 border-l border-rule pl-4" : "space-y-7"}>
      {steps.map((step, i) => {
        const num = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
        return (
          <li key={num} id={stepAnchor(num)} className="scroll-mt-6 flex gap-3">
            <span className="font-mono text-sm text-accent tabular-nums shrink-0 pt-0.5">{num}</span>
            <div className="min-w-0 flex-1">
              <StepText text={step.text} refs={refs} />
              {step.blocks && step.blocks.length > 0 && (
                <div className="mt-3 space-y-4">
                  {step.blocks.map((b, j) => (
                    <Block key={j} block={b} />
                  ))}
                </div>
              )}
              {step.children && step.children.length > 0 && <StepList steps={step.children} refs={refs} prefix={num} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// Disclosure native (<details>) uniquement pour les cas de test : longs, consultes a la
// demande, pas pour comprendre le processus.
function TestDisclosure({ count, children }: { count: number; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="cursor-pointer select-none text-sm font-medium text-ink hover:text-accent inline-flex items-center gap-2 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-faint transition-transform group-open:rotate-90" aria-hidden="true">
          ›
        </span>
        Cas de test
        <span className="font-mono text-xs text-muted">{count}</span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export default function ParcoursView({ parcours }: { parcours: Parcours }) {
  const refs = collectRefs(parcours.steps);
  const constraintIds = collectRuleIds(parcours.steps);
  const testCaseCount = parcours.testGroups.reduce((n, g) => n + g.cases.length, 0);

  return (
    <div className="space-y-10">
      <header className="rounded-lg bg-blue-50 px-5 py-4">
        <h1 className="text-2xl font-semibold text-blue-900">{parcours.title}</h1>
        <p className="text-blue-900 mt-2">
          <span className="label text-blue-700">utilisateur concerné </span>
          {parcours.userLine}
        </p>
      </header>

      <StepList steps={parcours.steps} refs={refs} />

      <section className="pt-2">
        <TestDisclosure count={testCaseCount}>
          <p className="text-sm text-muted -mt-1 mb-4 max-w-prose">
            Un cas par contrainte et par situation : nominal, limite, violation. La colonne C renvoie à la règle
            correspondante plus haut quand elle y figure.
          </p>
          <div className="space-y-8">
            {parcours.testGroups.map((g) => (
              <div key={g.title}>
                <h3 className="font-semibold text-ink mb-2">{g.title}</h3>
                <div className="overflow-x-auto border border-rule rounded-lg">
                  <table className="ledger">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>C</th>
                        <th>Cas</th>
                        <th>Étant donné</th>
                        <th>Action</th>
                        <th>Résultat attendu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.cases.map((t) => (
                        <tr key={t.id}>
                          <td className="font-mono text-xs text-muted whitespace-nowrap">{t.id}</td>
                          <td className="font-mono text-xs whitespace-nowrap">
                            {t.constraintId ? <ConstraintRef id={t.constraintId} known={constraintIds.has(t.constraintId)} /> : <span className="text-faint">–</span>}
                          </td>
                          <td className="text-ink font-medium">{t.title}</td>
                          <td className="text-ink">{t.given}</td>
                          <td className="font-mono text-xs text-ink">{t.when}</td>
                          <td className="text-ink">
                            {t.then}
                            {t.expected && (
                              <div className="mt-1.5 text-xs">
                                <span
                                  className={`font-mono px-1.5 py-px rounded-sm ${
                                    t.expected.customstatus < 300
                                      ? "bg-ok-soft text-ok"
                                      : t.expected.customstatus < 500
                                        ? "bg-warn-soft text-warn"
                                        : "bg-err-soft text-err"
                                  }`}
                                >
                                  {t.expected.customstatus}
                                </span>
                                {t.expected.message && <code className="block mt-1 whitespace-pre-wrap text-muted">{t.expected.message}</code>}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </TestDisclosure>
      </section>
    </div>
  );
}
