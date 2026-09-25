"use client";
import { useEffect, useState } from "react";
import Shell, { AsideGroup, AsideItem } from "./components/Shell";
import { allEndpoints, categories } from "./data";
import type { Access, CategoryKey, Endpoint, ErrorDoc } from "./data";

const accessLabel: Record<Access, { label: string; help: string }> = {
  public: { label: "public", help: "Aucun jeton requis" },
  member: { label: "membre", help: "Tout membre authentifié (jeton Bearer)" },
  manager: { label: "gestionnaire", help: "Réservé aux gestionnaires nkezefuu et administrateurs" },
  all: { label: "selon rôle", help: "Tout membre authentifié, comportement différent pour un gestionnaire" },
  admin: { label: "admin seul", help: "Administrateur système uniquement, même le Gestionnaire des comptes bancaires n'y a pas accès" },
  bank_account_manager: {
    label: "gest. comptes bancaires",
    help: "Administrateur système, ou Gestionnaire des comptes bancaires (rôle distinct du Gestionnaire nkezefuu, qui n'a aucun accès ici)",
  },
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
function errorBody(e: ErrorDoc, envelope?: "jsonrpc"): Record<string, unknown> {
  if (envelope === "jsonrpc") return { error: e.message, status: e.customstatus ?? e.status };
  return e.customstatus === undefined
    ? { error: e.message, status: e.status }
    : { error: e.message, status: e.status, customstatus: e.customstatus };
}

function EndpointRow({ endpoint, expanded, onToggle }: { endpoint: Endpoint; expanded: boolean; onToggle: () => void }) {
  const access = accessLabel[endpoint.access];

  return (
    <article id={`endpoint-${endpoint.id}`} className="border-t border-rule scroll-mt-6 first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left px-4 py-3.5 flex items-start gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <Method method={endpoint.method} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <code className="text-sm text-ink break-all">{endpoint.path}</code>
            <Tag title={access.help}>{access.label}</Tag>
            {endpoint.envelope === "jsonrpc" && <Tag title="Réponse enveloppée dans { jsonrpc, id, result }">json-rpc</Tag>}
          </span>
          <span className="block text-sm text-muted mt-0.5">{endpoint.summary}</span>
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
          {endpoint.usage && (
            <p className="text-sm text-ink max-w-prose">
              <span className="text-muted">Quand l&apos;appeler.</span> {endpoint.usage}
            </p>
          )}

          <Section title="Paramètres">
            {endpoint.params.length === 0 ? (
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
                    {endpoint.params.map((p) => (
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
              <pre className="codeblock">{endpoint.requestExample}</pre>
            </Section>
            <Section title={endpoint.success.length > 1 ? "Réponses en cas de succès" : "Réponse en cas de succès"}>
              <div className="space-y-3">
                {endpoint.success.map((s, i) => (
                  <div key={i}>
                    {s.label && <div className="text-xs text-muted mb-1">{s.label}</div>}
                    <pre className="codeblock">{JSON.stringify(s.body, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <Disclosure label={`Champs de la réponse (${endpoint.responseFields.length})`} className="">
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
                  {endpoint.responseFields.map((f) => (
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
              {endpoint.errors.map((e, i) => (
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
                  <pre className="codeblock">{JSON.stringify(errorBody(e, endpoint.envelope), null, 2)}</pre>
                </div>
              ))}
            </div>

            <Disclosure label="Dans quel cas chaque erreur est renvoyée">
              <div className="overflow-x-auto bg-surface border border-rule rounded-lg">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>HTTP</th>
                      <th>{endpoint.envelope === "jsonrpc" ? "result.status" : "customstatus"}</th>
                      <th>Message</th>
                      <th>Quand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.errors.map((e, i) => (
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

          {endpoint.notes && endpoint.notes.length > 0 && (
            <Section title="À savoir">
              <ul className="space-y-1.5 text-sm text-ink max-w-prose">
                {endpoint.notes.map((n, i) => (
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

export default function ApiDocumentation() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("signup");
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const term = searchTerm.trim().toLowerCase();
  const matches = (ep: Endpoint) =>
    !term ||
    ep.path.toLowerCase().includes(term) ||
    ep.summary.toLowerCase().includes(term) ||
    ep.params.some((p) => p.name.toLowerCase().includes(term)) ||
    ep.responseFields.some((f) => f.name.toLowerCase().includes(term)) ||
    ep.errors.some((e) => e.message.toLowerCase().includes(term));

  const filteredEndpoints = allEndpoints.filter((ep) => (term ? matches(ep) : ep.category === activeCategory));

  // Lien profond /#endpoint-<id> (depuis les parcours) : ouvrir la bonne categorie et deplier la fiche.
  useEffect(() => {
    const openFromHash = () => {
      if (!window.location.hash.startsWith("#endpoint-")) return;
      const id = window.location.hash.replace(/^#endpoint-/, "");
      const ep = allEndpoints.find((e) => e.id === id);
      if (!ep) return;
      setSearchTerm("");
      setActiveCategory(ep.category);
      setExpandedEndpoint(ep.id);
      setTimeout(() => {
        document.getElementById(`endpoint-${ep.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  const category = categories[activeCategory];
  const countByCategory = (key: CategoryKey) => allEndpoints.filter((e) => e.category === key).length;

  const aside = (
    <>
      <div className="mb-6">
        <label htmlFor="endpoint-search" className="label block mb-2">
          Rechercher
        </label>
        <input
          id="endpoint-search"
          type="search"
          placeholder="chemin, champ, message…"
          className="w-full bg-surface border border-rule rounded-md px-3 py-2 text-sm placeholder:text-faint focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <AsideGroup title="Catégories">
        {(Object.keys(categories) as CategoryKey[]).map((key) => (
          <AsideItem
            key={key}
            active={activeCategory === key && !term}
            onClick={() => {
              setSearchTerm("");
              setActiveCategory(key);
              setExpandedEndpoint(null);
            }}
            hint={String(countByCategory(key))}
          >
            {categories[key].name}
          </AsideItem>
        ))}
      </AsideGroup>
    </>
  );

  return (
    <Shell aside={aside}>
      {term ? (
        <div className="mb-6 rounded-lg bg-blue-50 px-5 py-4">
          <h1 className="text-2xl font-semibold text-blue-900">Recherche</h1>
          <p className="text-blue-800 mt-1">
            {filteredEndpoints.length} endpoint{filteredEndpoints.length > 1 ? "s" : ""} pour « {searchTerm} », toutes catégories confondues.
          </p>
        </div>
      ) : (
        <div className="mb-6 rounded-lg bg-blue-50 px-5 py-4">
          <h1 className="text-2xl font-semibold text-blue-900">{category.name}</h1>
          <p className="text-blue-800 mt-1 max-w-prose">{category.description}</p>
        </div>
      )}

      {!term && activeCategory === "signup" && (
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
        {filteredEndpoints.length > 0 ? (
          filteredEndpoints.map((endpoint) => (
            <EndpointRow
              key={endpoint.id}
              endpoint={endpoint}
              expanded={expandedEndpoint === endpoint.id}
              onToggle={() => setExpandedEndpoint(expandedEndpoint === endpoint.id ? null : endpoint.id)}
            />
          ))
        ) : (
          <p className="px-4 py-10 text-muted">Aucun endpoint ne correspond. Essayez un autre terme.</p>
        )}
      </div>
    </Shell>
  );
}
