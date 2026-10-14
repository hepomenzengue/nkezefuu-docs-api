"use client";
import { useState } from "react";
import { useAuth } from "../components/AuthGate";
import { Button, ErrorMessage, Field, PasswordInput } from "../components/recette/ui";
import Shell from "../components/Shell";
import { api, ApiError, replaceSession } from "../lib/api";
import { ROLE_LABELS } from "../lib/recette";

const MIN_LENGTH = 8;

export default function ProfilPage() {
  const { user } = useAuth();
  return (
    <Shell>
      <div className="max-w-xl space-y-8">
        <div className="rounded-lg bg-blue-50 px-5 py-4">
          <h1 className="text-2xl font-semibold text-blue-900">Mon profil</h1>
        </div>

        <section>
          <h2 className="label mb-3">Informations</h2>
          <dl className="bg-surface border border-rule rounded-lg p-4 space-y-3 text-sm">
            <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-4">
              <dt className="text-muted">Nom</dt>
              <dd className="text-ink">{user.name}</dd>
            </div>
            <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-4">
              <dt className="text-muted">Identifiant</dt>
              <dd className="text-ink">{user.login}</dd>
            </div>
            <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-4">
              <dt className="text-muted">Rôles</dt>
              <dd className="text-ink">{user.roles.map((role) => ROLE_LABELS[role] ?? role).join(", ")}</dd>
            </div>
          </dl>
        </section>

        <PasswordForm />
      </div>
    </Shell>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const tooShort = next.length > 0 && next.trim().length < MIN_LENGTH;
  const mismatch = confirmation.length > 0 && confirmation !== next;
  const valid = current && next.trim().length >= MIN_LENGTH && confirmation === next && next !== current;

  const submit = async () => {
    setPending(true);
    setError(null);
    setDone(false);
    try {
      // La reponse est une nouvelle session : les autres connexions du compte sont fermees.
      const data = await api<Record<string, unknown>>("/account/password", {
        method: "POST",
        body: { current_password: current, new_password: next },
      });
      replaceSession(data);
      setCurrent("");
      setNext("");
      setConfirmation("");
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section>
      <h2 className="label mb-3">Modifier le mot de passe</h2>
      <div className="bg-surface border border-rule rounded-lg p-4 space-y-4">
        <Field label="Mot de passe actuel" htmlFor="pwd-current">
          <PasswordInput id="pwd-current" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field
          label="Nouveau mot de passe"
          htmlFor="pwd-new"
          hint={tooShort ? `${MIN_LENGTH} caractères minimum.` : `${MIN_LENGTH} caractères minimum, différent de l'actuel.`}
        >
          <PasswordInput id="pwd-new" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirmation" htmlFor="pwd-confirm" hint={mismatch ? "Les deux saisies ne correspondent pas." : undefined}>
          <PasswordInput
            id="pwd-confirm"
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </Field>
        <ErrorMessage message={error} />
        {done && (
          <p role="status" className="text-sm text-ok bg-ok-soft rounded-md px-3 py-2">
            Votre mot de passe a été modifié. Vos autres sessions ont été fermées.
          </p>
        )}
        <Button onClick={submit} disabled={pending || !valid}>
          Enregistrer
        </Button>
      </div>
    </section>
  );
}
