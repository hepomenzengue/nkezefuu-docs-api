"use client";
// Petits elements de formulaire communs a la connexion, a la recette et au profil.
import { useState, type ReactNode } from "react";
import { resultTone } from "../../lib/recette";

const inputClass =
  "w-full bg-surface border border-rule rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none";

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label block mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

// Mot de passe avec un oeil pour afficher ou masquer la saisie.
export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${inputClass} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-ink cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={inputClass} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />;
}

export function Button({
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const tone =
    variant === "primary"
      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
      : variant === "danger"
        ? "bg-surface border border-err text-err hover:bg-err-soft"
        : "bg-surface border border-rule text-ink hover:bg-gray-50";
  return (
    <button
      type="button"
      {...props}
      className={`text-sm font-medium rounded-md px-4 py-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${tone}`}
    />
  );
}

export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-err bg-err-soft rounded-md px-3 py-2">
      {message}
    </p>
  );
}

export function StatusPill({ code, label }: { code: string; label: string }) {
  return <span className={`inline-block whitespace-nowrap text-xs font-medium rounded-full px-2.5 py-0.5 ${resultTone(code)}`}>{label}</span>;
}

// Fenetre modale simple, fermee par le bouton Annuler du contenu ou par Echap.
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 px-4 py-16 overflow-y-auto"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-lg bg-surface rounded-lg shadow-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}
