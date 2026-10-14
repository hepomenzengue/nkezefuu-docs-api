"use client";
import Image from "next/image";
import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, login, logout, onSessionChange, readSession } from "../lib/api";
import type { User } from "../lib/types";
import { PasswordInput } from "./recette/ui";

type AuthContextValue = { user: User; logout: () => Promise<void> };

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth hors de AuthGate");
  return value;
}

// Porte du site : sans session, l'ecran de connexion remplace la page demandee, a la
// meme adresse ; une fois connecte, la page s'affiche directement. La session se lit
// apres le montage, le site etant genere a l'avance sans acces au navigateur.
export default function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    setUser(readSession()?.user ?? null);
    return onSessionChange((session) => setUser(session?.user ?? null));
  }, []);

  if (user === undefined) return <div className="min-h-screen" aria-busy="true" />;
  if (user === null) return <LoginScreen />;
  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}

function LoginScreen() {
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(identifiant.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Une erreur est survenue.");
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 py-6 flex items-center gap-4">
          <div className="flex items-center justify-center h-14 w-14 rounded-lg shadow shrink-0">
            <Image src="/logo.png" alt="Nkezefuu Logo" width={200} height={200} className="object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">NKEZEFUU</h1>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-16">
        <form onSubmit={submit} className="w-full max-w-sm bg-surface border border-rule rounded-lg shadow-sm p-6 space-y-5">
          <h2 className="text-xl font-semibold text-ink">Connexion</h2>

          <div>
            <label htmlFor="login-identifiant" className="label block mb-1.5">
              Identifiant
            </label>
            <input
              id="login-identifiant"
              type="text"
              autoComplete="username"
              required
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              className="w-full bg-surface border border-rule rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="label block mb-1.5">
              Mot de passe
            </label>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-err bg-err-soft rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-md px-4 py-2.5 transition-colors cursor-pointer disabled:cursor-wait"
          >
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </main>
    </div>
  );
}
