"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const sections = [
  { href: "/", label: "Endpoints", isActive: (p: string) => p === "/" },
  { href: "/parcours/", label: "Parcours", isActive: (p: string) => p.startsWith("/parcours") },
];

// Coque commune : barre haute fine, barre laterale (contenu fourni par la page), colonne principale.
export default function Shell({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  const pathname = usePathname() ?? "/";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4 min-w-0">
              <div className="flex items-center justify-center h-16 w-16 rounded-lg shadow md:hidden shrink-0">
                <Image src="/logo.png" alt="Nkezefuu Logo" width={200} height={200} className="object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold">NKEZEFUU</h1>
                <p className="mt-1 text-sm md:text-base opacity-90">
                  Guide d&apos;intégration de l&apos;API mobile : endpoints, parcours et cas de test
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center justify-center h-24 w-24 rounded-lg shadow shrink-0">
              <Image src="/logo.png" alt="Nkezefuu Logo" width={700} height={700} className="object-contain" />
            </div>
          </div>

          <nav className="mt-5 flex gap-6" aria-label="Sections">
            {sections.map((s) => {
              const active = s.isActive(pathname);
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative pb-3 text-sm font-medium transition-colors ${
                    active ? "text-white" : "text-indigo-100 hover:text-white"
                  }`}
                >
                  {s.label}
                  {active && <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-white rounded-full" aria-hidden="true" />}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8 flex-1 grid gap-8 lg:gap-12 grid-cols-[minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)] py-8">
        {aside && (
          <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto bg-surface border border-rule rounded-lg shadow-sm p-4">
            {aside}
          </aside>
        )}
        <main className={`min-w-0 ${aside ? "" : "lg:col-span-2"}`}>{children}</main>
      </div>

      <footer className="bg-gray-100 border-t border-rule py-8 mt-12">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
          <div className="bg-white p-1 rounded-lg shadow-md w-full max-w-[300px] mx-auto">
            <div className="relative w-full h-24">
              <Image src="/social-preview.jpeg" alt="NKEZEFUU" fill className="object-contain p-2" sizes="(max-width: 768px) 100vw, 300px" />
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-rule text-center text-muted text-sm">
            <p>© {new Date().getFullYear()} NKEZEFUU. Tous droits réservés</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Groupe de navigation laterale : une etiquette en petites capitales et une liste d'entrees.
export function AsideGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-7">
      <div className="label mb-2">{title}</div>
      <ul className="flex lg:flex-col gap-1 lg:gap-0.5 overflow-x-auto lg:overflow-visible max-w-full pb-1 lg:pb-0">{children}</ul>
    </div>
  );
}

export function AsideItem({
  active,
  onClick,
  href,
  children,
  hint,
}: {
  active?: boolean;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
  hint?: string;
}) {
  const className = `flex items-center w-full text-left py-1.5 text-sm whitespace-nowrap lg:whitespace-normal transition-colors cursor-pointer ${
    active ? "text-indigo-700 font-medium" : "text-muted hover:text-ink"
  }`;
  const body = (
    <>
      <span
        className={`self-stretch w-0.5 mr-2.5 shrink-0 rounded-full transition-colors ${active ? "bg-indigo-600" : "bg-transparent"}`}
        aria-hidden="true"
      />
      <span>{children}</span>
      {hint && <span className="ml-2 font-mono text-[0.65rem] text-faint">{hint}</span>}
    </>
  );
  return (
    <li className="shrink-0">
      {href ? (
        <Link href={href} className={className} aria-current={active ? "page" : undefined}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={className} aria-current={active ? "page" : undefined}>
          {body}
        </button>
      )}
    </li>
  );
}
