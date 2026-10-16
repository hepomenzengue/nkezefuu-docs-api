"use client";
// Captures d'ecran jointes a un message de la recette (resultat, reponse, commentaire).
// Ajout par bouton (galerie sur telephone), glisser-deposer ou Ctrl+V ; chaque image est
// reduite dans le navigateur avant l'envoi. A l'affichage, les images passent par l'API
// avec le jeton : elles ne sont pas publiques.
import { useEffect, useRef, useState } from "react";
import { apiBlob } from "../../lib/api";
import type { Capture } from "../../lib/types";

// Memes limites que le serveur (nkezefuu.recette.echange)
export const MAX_CAPTURES = 5;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
// Assez pour lire un ecran de telephone ou d'ordinateur, sans envoyer plusieurs Mo
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 4000;

export type PendingCapture = { key: number; name: string; data: string };

let nextKey = 0;

async function shrink(file: File): Promise<PendingCapture> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width, MAX_HEIGHT / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  // Fond blanc : une capture PNG transparente deviendrait noire en JPEG
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const data = canvas.toDataURL("image/jpeg", 0.85);
  const base = file.name.replace(/\.[^.]+$/, "") || "capture";
  return { key: nextKey++, name: `${base}.jpg`, data };
}

// Captures en attente d'envoi d'un formulaire, et les gestes pour en ajouter
export function usePendingCaptures() {
  const [captures, setCaptures] = useState<PendingCapture[]>([]);
  const [error, setError] = useState<string | null>(null);

  const add = async (files: File[]) => {
    setError(null);
    const images = files.filter((f) => ACCEPTED_TYPES.includes(f.type));
    if (images.length < files.length) setError("Seules les images PNG, JPEG ou WebP sont acceptées.");
    const room = MAX_CAPTURES - captures.length;
    if (images.length > room) setError(`${MAX_CAPTURES} captures au plus par message.`);
    try {
      const ready = await Promise.all(images.slice(0, Math.max(room, 0)).map(shrink));
      setCaptures((current) => [...current, ...ready].slice(0, MAX_CAPTURES));
    } catch {
      setError("Une image n'a pas pu être lue.");
    }
  };

  const remove = (key: number) => setCaptures((current) => current.filter((c) => c.key !== key));
  const clear = () => {
    setCaptures([]);
    setError(null);
  };

  // A poser sur la zone du formulaire : Ctrl+V d'une capture, et glisser-deposer
  const zoneProps = {
    onPaste: (e: React.ClipboardEvent) => {
      const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        add(files);
      }
    },
    onDragOver: (e: React.DragEvent) => {
      if (Array.from(e.dataTransfer.items).some((i) => i.kind === "file")) e.preventDefault();
    },
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      add(Array.from(e.dataTransfer.files));
    },
  };

  // Corps envoye a l'API
  const payload = captures.map(({ name, data }) => ({ name, data }));

  return { captures, error, add, remove, clear, zoneProps, payload };
}

export type PendingCapturesState = ReturnType<typeof usePendingCaptures>;

export function CapturePicker({ state, disabled }: { state: PendingCapturesState; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const full = state.captures.length >= MAX_CAPTURES;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={disabled || full}
          className="text-sm text-accent hover:text-accent-ink cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Joindre une capture
        </button>
        <span className="text-xs text-muted">
          ou collez-la (Ctrl+V), ou déposez-la ici · {state.captures.length}/{MAX_CAPTURES}
        </span>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          hidden
          onChange={(e) => {
            state.add(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>
      {state.error && <p className="text-xs text-err">{state.error}</p>}
      {state.captures.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {state.captures.map((c) => (
            <li key={c.key} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.data} alt={c.name} className="h-16 w-16 object-cover rounded border border-rule" />
              <button
                type="button"
                onClick={() => state.remove(c.key)}
                aria-label={`Retirer ${c.name}`}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-surface border border-rule text-xs text-muted hover:text-err cursor-pointer"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Affichage des captures envoyees
// ---------------------------------------------------------------------------

function useCaptureUrl(id: number) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    let objectUrl: string | null = null;
    apiBlob(`/captures/${id}`)
      .then((blob) => {
        if (!live) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return { url, failed };
}

function CaptureThumb({ capture, onOpen }: { capture: Capture; onOpen: (url: string) => void }) {
  const { url, failed } = useCaptureUrl(capture.id);
  if (failed) {
    return <span className="h-20 w-20 flex items-center justify-center rounded border border-rule text-xs text-faint text-center">Image indisponible</span>;
  }
  if (!url) return <span className="h-20 w-20 rounded border border-rule bg-gray-100 animate-pulse" />;
  return (
    <button type="button" onClick={() => onOpen(url)} className="cursor-zoom-in" aria-label={`Agrandir ${capture.name}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={capture.name} className="h-20 w-20 object-cover rounded border border-rule hover:border-accent" />
    </button>
  );
}

export function CaptureGallery({ captures }: { captures: Capture[] }) {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Echap ferme l'image sans fermer la fiche du cas
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setOpen(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (!captures.length) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {captures.map((c) => (
          <CaptureThumb key={c.id} capture={c} onOpen={setOpen} />
        ))}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Capture d'écran"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open} alt="Capture d'écran" className="max-h-full max-w-full rounded shadow-xl" />
        </div>
      )}
    </>
  );
}
