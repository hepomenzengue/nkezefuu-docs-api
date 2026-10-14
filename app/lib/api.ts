// Acces a l'API du module nkezefuu_recette (management.nkezefuu.com). Tout le contenu du
// site en vient : rien n'est embarque dans le JavaScript, et chaque appel porte le jeton
// de l'utilisateur connecte.
//
// Conventions de l'API : reponse HTTP 200, vrai resultat dans customstatus, message
// d'erreur dans error. Sur un 401, le jeton d'acces est renouvele une fois avec le jeton
// de renouvellement, puis l'appel est rejoue ; si le renouvellement echoue, la session
// est fermee et l'ecran de connexion s'affiche.

import type { Session, User } from "./types";

// L'API suit l'adresse sur laquelle le site est ouvert : ouvert en local, il appelle
// l'Odoo local ; en ligne, le serveur management. Rien a configurer, et le site en ligne
// ne peut pas appeler localhost par erreur. NEXT_PUBLIC_API_URL, s'il est defini au
// lancement, impose une autre adresse.
const LOCAL_API_URL = "http://localhost:8169";
const ONLINE_API_URL = "https://management.nkezefuu.com";
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

function apiUrl(): string {
  const forced = process.env.NEXT_PUBLIC_API_URL;
  if (forced) return forced.replace(/\/$/, "");
  return LOCAL_HOSTS.includes(window.location.hostname) ? LOCAL_API_URL : ONLINE_API_URL;
}
const PREFIX = "/api/recette";
const STORAGE_KEY = "nkezefuu-session";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Session, gardee dans le navigateur pour survivre a un rechargement
// ---------------------------------------------------------------------------

type Listener = (session: Session | null) => void;
const listeners = new Set<Listener>();

export function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible (navigation privee stricte) : la session vit le temps de la page.
  }
  listeners.forEach((listener) => listener(session));
}

export function onSessionChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------------------------------------------------------------------------
// Appels
// ---------------------------------------------------------------------------

async function send(path: string, init: RequestInit, token?: string): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}${PREFIX}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new ApiError(0, "Le serveur est injoignable. Vérifiez votre connexion et réessayez.");
  }
  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(response.status, "Réponse inattendue du serveur.");
  }
  const status = typeof data.customstatus === "number" ? data.customstatus : response.status;
  if (status !== 200) throw new ApiError(status, String(data.error ?? "Une erreur est survenue."));
  return data;
}

function toSession(data: Record<string, unknown>): Session {
  return {
    token: data.token as string,
    refreshToken: data.refresh_token as string,
    user: data.user as User,
  };
}

// Un seul renouvellement a la fois : plusieurs appels qui recoivent 401 ensemble
// attendent le meme, au lieu de consommer chacun le jeton de renouvellement (qui est a
// usage unique).
let refreshing: Promise<Session | null> | null = null;

function refresh(session: Session): Promise<Session | null> {
  refreshing ??= send("/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token: session.refreshToken }) })
    .then((data) => {
      const renewed = toSession(data);
      writeSession(renewed);
      return renewed;
    })
    .catch(() => {
      writeSession(null);
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(path: string, options: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  const init: RequestInit = {
    method: options.method ?? "GET",
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  };
  const session = readSession();
  if (!session) throw new ApiError(401, "Authentification requise");
  try {
    return (await send(path, init, session.token)) as T;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const renewed = await refresh(session);
    if (!renewed) throw new ApiError(401, "Session expirée, reconnectez-vous");
    return (await send(path, init, renewed.token)) as T;
  }
}

export async function login(identifiant: string, password: string): Promise<Session> {
  const data = await send("/auth/login", { method: "POST", body: JSON.stringify({ login: identifiant, password }) });
  const session = toSession(data);
  writeSession(session);
  return session;
}

export async function logout() {
  const session = readSession();
  writeSession(null);
  clearCache();
  if (session) {
    // La session locale est deja fermee : un echec ici ne doit pas bloquer l'utilisateur.
    await send("/auth/logout", { method: "POST" }, session.token).catch(() => undefined);
  }
}

// Remplace la session apres un changement de mot de passe, qui renvoie une nouvelle paire.
export function replaceSession(data: Record<string, unknown>) {
  writeSession(toSession(data));
}

// ---------------------------------------------------------------------------
// Cache des lectures de documentation, le temps de la visite : la navigation entre
// pages ne relit pas Odoo a chaque fois. Un rechargement de la page repart de zero.
// ---------------------------------------------------------------------------

const cache = new Map<string, Promise<unknown>>();

export function cachedGet<T>(path: string): Promise<T> {
  let entry = cache.get(path) as Promise<T> | undefined;
  if (!entry) {
    entry = api<T>(path);
    cache.set(path, entry);
    // Un echec n'est pas garde : le prochain affichage reessaie.
    entry.catch(() => cache.delete(path));
  }
  return entry;
}

export function clearCache() {
  cache.clear();
}
