import Link from "next/link";
import { notFound } from "next/navigation";
import Shell from "../../components/Shell";
import ParcoursAside from "../../components/ParcoursAside";
import ParcoursView from "../../components/ParcoursView";
import { getParcours, parcoursList } from "../../data/parcours";

export const dynamicParams = false;

export function generateStaticParams() {
  return parcoursList.map((p) => ({ slug: p.slug }));
}

export default async function ParcoursPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parcours = getParcours(slug);
  if (!parcours) notFound();

  return (
    <Shell aside={<ParcoursAside />}>
      <nav className="label mb-4" aria-label="Fil d'Ariane">
        <Link href="/parcours/" className="hover:text-ink">
          Parcours
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{parcours.title}</span>
      </nav>
      <ParcoursView parcours={parcours} />
    </Shell>
  );
}
