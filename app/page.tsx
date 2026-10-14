"use client";
import { useEffect, useMemo, useState } from "react";
import LoadState from "./components/LoadState";
import { ServicesSkeleton } from "./components/Skeleton";
import Shell, { AsideGroup, AsideItem } from "./components/Shell";
import type { ErrorDoc, Service, ServiceCategory } from "./lib/types";
import { useApi } from "./lib/useApi";

// Le libelle de l'acces vient de l'API ; l'explication au survol reste ici.
const accessHelp: Record<string, string> = {
  public: "Aucun jeton requis",
  member: "Tout membre authentifié (jeton Bearer)",
  manager: "Réservé aux gestionnaires nkezefuu et administrateurs",
  all: "Tout membre authentifié, comportement différent pour un gestionnaire",
  admin: "Administrateur système uniquement, même le Gestionnaire des comptes bancaires n'y a pas accès",
  bank_account_manager:
    "Administrateur système, ou Gestionnaire des comptes bancaires (rôle distinct du Gestionnaire nkezefuu, qui n'a aucun accès ici)",
};

const paramInLabel: Record<string, string> = {
  path: "chemin",
  query: "query",
  body: "corps",
};

function Method({ method }: { method: string }) {
  return (
    <span
      className={`font-mono text-xs font-medium tracking-wide shrink-0 px-2 py-0.5 rounded ${
        method === "GET" ? "bg-get-soft text-get" : "bg-post-soft text-post"
      }`}
    >
      {method}
    </span>
  );
}

function Tag({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className="font-mono text-[0.68rem] tracking-wide text-accent-ink bg-accent-soft rounded-full px-2 py-px">
      {children}
    </span>
  );
}

function Code({ code }: { code?: number }) {
  const cls =
    !code ? "text-faint" : code < 300 ? "text-ok" : code < 500 ? "text-warn" : "text-err";
  return <span className={`font-mono ${cls}`}>{code ?? "–"}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="label mb-2">{title}</div>
      {children}
    </section>
  );
}

// Meme disclosure native que sur les pages Parcours : l'essentiel reste visible, le
// detail se deplie a la demande.
function Disclosure({ label, children, className = "mt-3" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <details className={`group ${className}`}>
      <summary className="cursor-pointer select-none text-sm text-muted hover:text-accent inline-flex items-center gap-2 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-faint transition-transform group-open:rotate-90" aria-hidden="true">
          ›
        </span>
        {label}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

// Corps JSON d'une erreur, tel qu'il etait affiche avant : le message dans error, puis
// le ou les codes. Sur une route json-rpc, le code applicatif est result.status et il
// n'y a pas de customstatus.
function errorBody(e: ErrorDoc, envelope: "jsonrpc" | null): Record<string, unknown> {
  if (envelope === "jsonrpc") return { error: e.message, status: e.customstatus ?? e.status };
  return e.customstatus === undefined
    ? { error: e.message, status: e.status }
    : { error: e.message, status: e.status, customstatus: e.customstatus };
}

function ServiceRow({ service, expanded, onToggle }: { service: Service; expanded: boolean; onToggle: () => void }) {
  return (
    <article id={`service-${service.code}`} className="border-t border-rule scroll-mt-6 first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left px-4 py-3.5 flex items-start gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <Method method={service.method} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <code className="text-sm text-ink break-all">{service.path}</code>
            <Tag title={accessHelp[service.access.code]}>{service.access.label}</Tag>
            {service.envelope === "jsonrpc" && <Tag title="Réponse enveloppée dans { jsonrpc, id, result }">json-rpc</Tag>}
          </span>
          <span className="block text-sm text-muted mt-0.5">{service.summary}</span>
        </span>
        <span
          className={`font-mono text-faint text-sm mt-0.5 transition-transform ${expanded ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-8 pt-2 space-y-7 bg-gray-50 border-t border-rule">
          {service.usage && (
            <p className="text-sm text-ink max-w-prose">
              <span className="text-muted">Quand l&apos;appeler.</span> {service.usage}
            </p>
          )}

          <Section title="Paramètres">
            {service.params.length === 0 ? (
              <p className="text-sm text-muted">Aucun paramètre, jeton Bearer uniquement.</p>
            ) : (
              <div className="overflow-x-auto bg-surface border border-rule rounded-lg">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Où</th>
                      <th>Type</th>
                      <th>Requis</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {service.params.map((p) => (
                      <tr key={`${p.in}-${p.name}`}>
                        <td className="font-mono text-ink whitespace-nowrap">{p.name}</td>
                        <td className="text-muted whitespace-nowrap">{paramInLabel[p.in]}</td>
                        <td className="text-muted whitespace-nowrap font-mono text-xs">{p.type}</td>
                        <td className="whitespace-nowrap">{p.required ? <span className="text-ink">oui</span> : <span className="text-faint">non</span>}</td>
                        <td className="text-ink">
                          {p.description}
                          {p.example !== undefined && (
                            <span className="block text-xs text-muted mt-1">
                              ex. <code>{p.example}</code>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <div className="grid xl:grid-cols-2 gap-7">
            <Section title="Requête">
              <pre className="codeblock">{service.request_example}</pre>
            </Section>
            <Section title={service.success_examples.length > 1 ? "Réponses en cas de succès" : "Réponse en cas de succès"}>
              <div className="space-y-3">
                {service.success_examples.map((s, i) => (
                  <div key={i}>
                    {s.label && <div className="text-xs text-muted mb-1">{s.label}</div>}
                    <pre className="codeblock">{JSON.stringify(s.body, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <Disclosure label={`Champs de la réponse (${service.response_fields.length})`} className="">
            <div className="overflow-x-auto bg-surface border border-rule rounded-lg">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Champ</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {service.response_fields.map((f) => (
                    <tr key={f.name}>
                      <td className="font-mono text-xs text-ink">{f.name}</td>
                      <td className="font-mono text-xs text-muted whitespace-nowrap">{f.type}</td>
                      <td className="text-ink">{f.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Disclosure>

          <Section title="Erreurs">
            <div className="space-y-3">
              {service.errors.map((e, i) => (
                <div key={i}>
                  <div className="text-xs text-muted mb-1">
                    Status: <Code code={e.status} />
                    {e.customstatus !== undefined && (
                      <>
                        {" ("}
                        <Code code={e.customstatus} />
                        {")"}
                      </>
                    )}
                  </div>
                  <pre className="codeblock">{JSON.stringify(errorBody(e, service.envelope), null, 2)}</pre>
                </div>
              ))}
            </div>

            <Disclosure label="Dans quel cas chaque erreur est renvoyée">
              <div className="overflow-x-auto bg-surface border border-rule rounded-lg">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>HTTP</th>
                      <th>{service.envelope === "jsonrpc" ? "result.status" : "customstatus"}</th>
                      <th>Message</th>
                      <th>Quand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {service.errors.map((e, i) => (
                      <tr key={i}>
                        <td>
                          <Code code={e.status} />
                        </td>
                        <td>
                          <Code code={e.customstatus} />
                        </td>
                        <td className="font-mono text-xs text-ink whitespace-pre-wrap">{e.message}</td>
                        <td className="text-ink">{e.when}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Disclosure>
          </Section>

          {service.notes.length > 0 && (
            <Section title="À savoir">
              <ul className="space-y-1.5 text-sm text-ink max-w-prose">
                {service.notes.map((n, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-accent shrink-0" aria-hidden="true">
                      •
                    </span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </article>
  );
}

export default function ServicesPage() {
  const { data, error, loading } = useApi<{ categories: ServiceCategory[] }>("/docs/services");
  const categories = useMemo(() => data?.categories ?? [], [data]);
  const allServices = useMemo(() => categories.flatMap((c) => c.services), [categories]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const term = searchTerm.trim().toLowerCase();
  const matches = (ep: Service) =>
    !term ||
    ep.path.toLowerCase().includes(term) ||
    ep.summary.toLowerCase().includes(term) ||
    ep.params.some((p) => p.name.toLowerCase().includes(term)) ||
    ep.response_fields.some((f) => f.name.toLowerCase().includes(term)) ||
    ep.errors.some((e) => e.message.toLowerCase().includes(term));

  const category = categories.find((c) => c.code === activeCategory) ?? categories[0];
  const filteredServices = term ? allServices.filter(matches) : (category?.services ?? []);

  // Lien profond /#service-<code> (depuis les parcours) : ouvrir la bonne categorie et
  // deplier la fiche, une fois les services charges.
  useEffect(() => {
    if (!allServices.length) return;
    const openFromHash = () => {
      if (!window.location.hash.startsWith("#service-")) return;
      const code = window.location.hash.replace(/^#service-/, "");
      const ep = allServices.find((e) => e.code === code);
      if (!ep) return;
      setSearchTerm("");
      setActiveCategory(ep.category);
      setExpandedService(ep.code);
      setTimeout(() => {
        document.getElementById(`service-${ep.code}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [allServices]);

  const aside = (
    <>
      <div className="mb-6">
        <label htmlFor="service-search" className="label block mb-2">
          Rechercher
        </label>
        <input
          id="service-search"
          type="search"
          placeholder="chemin, champ, message…"
          className="w-full bg-surface border border-rule rounded-md px-3 py-2 text-sm placeholder:text-faint focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <AsideGroup title="Catégories">
        {categories.map((c) => (
          <AsideItem
            key={c.code}
            active={category?.code === c.code && !term}
            onClick={() => {
              setSearchTerm("");
              setActiveCategory(c.code);
              setExpandedService(null);
            }}
            hint={String(c.services.length)}
          >
            {c.name}
          </AsideItem>
        ))}
      </AsideGroup>
    </>
  );

  if (!data) {
    return (
      <Shell>
        <LoadState loading={loading} error={error} skeleton={<ServicesSkeleton />} />
      </Shell>
    );
  }

  return (
    <Shell aside={aside}>
      {term ? (
        <div className="mb-6 rounded-lg bg-blue-50 px-5 py-4">
          <h1 className="text-2xl font-semibold text-blue-900">Recherche</h1>
          <p className="text-blue-800 mt-1">
            {filteredServices.length} service{filteredServices.length > 1 ? "s" : ""} pour « {searchTerm} », toutes catégories confondues.
          </p>
        </div>
      ) : (
        category && (
          <div className="mb-6 rounded-lg bg-blue-50 px-5 py-4">
            <h1 className="text-2xl font-semibold text-blue-900">{category.name}</h1>
            <p className="text-blue-800 mt-1 max-w-prose">{category.description}</p>
          </div>
        )
      )}

      {!term && category === categories[0] && (
        <div className="mb-8 text-sm text-ink max-w-prose space-y-2">
          <p>
            <span className="text-muted">Conventions.</span> Sauf mention contraire, chaque appel envoie{" "}
            <code>Authorization: Bearer &lt;token&gt;</code> et reçoit du JSON. Le code HTTP est presque toujours 200 : c&apos;est{" "}
            <code>customstatus</code> qui porte le résultat (200 succès, 400 requête invalide, 401 authentification, 403 accès
            refusé, 404 introuvable, 500 erreur serveur) et <code>error</code> le message à afficher.
          </p>
          <p>
            Les routes marquées <Tag>json-rpc</Tag> renvoient leurs champs dans <code>result</code> et utilisent{" "}
            <code>result.status</code> à la place de customstatus.
          </p>
        </div>
      )}

      <div className="bg-surface border border-rule rounded-lg shadow-sm overflow-hidden">
        {filteredServices.length > 0 ? (
          filteredServices.map((service) => (
            <ServiceRow
              key={service.code}
              service={service}
              expanded={expandedService === service.code}
              onToggle={() => setExpandedService(expandedService === service.code ? null : service.code)}
            />
          ))
        ) : (
          <p className="px-4 py-10 text-muted">Aucun service ne correspond. Essayez un autre terme.</p>
        )}
      </div>
    </Shell>
  );
}
