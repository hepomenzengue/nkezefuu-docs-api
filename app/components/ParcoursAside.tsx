"use client";
import { usePathname } from "next/navigation";
import { AsideGroup, AsideItem } from "./Shell";
import { parcoursList } from "../data/parcours";

export default function ParcoursAside() {
  const pathname = usePathname() ?? "";
  return (
    <AsideGroup title="Parcours">
      {parcoursList.map((p) => (
        <AsideItem key={p.slug} href={`/parcours/${p.slug}/`} active={pathname.includes(`/parcours/${p.slug}`)}>
          {p.title}
        </AsideItem>
      ))}
    </AsideGroup>
  );
}
