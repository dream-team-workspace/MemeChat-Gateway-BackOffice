import { useSyncExternalStore } from "react";

import {
  ACCESS_LOGOUT_PATH,
  fetchAccessIdentity,
  type AccessIdentity,
} from "./cloudflare-access";

export type Session = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: string;
  signedInAt: string;
  provider: string;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthState = {
  status: AuthStatus;
  session: Session | null;
};

const INITIAL_STATE: AuthState = { status: "loading", session: null };
const LEGACY_STORAGE_KEY = "bo-session";
const SESSION_TTL_MS = 5 * 60 * 1000;
const DEV_EMAIL =
  (import.meta.env.VITE_DEV_AUTH_EMAIL ?? "operator@dream-team.works").trim() ||
  "operator@dream-team.works";

// The template previously stored a mock session in localStorage. Access uses an
// HttpOnly cookie; remove the old key so a stale mock identity cannot be reused.
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* private mode / storage disabled */
  }
}

let state: AuthState = INITIAL_STATE;
let loadPromise: Promise<Session | null> | null = null;
let loadedAt = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setState(next: AuthState) {
  state = next;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function initialsFor(name: string, email: string) {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  const fromName =
    parts.length > 1
      ? parts
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
      : (parts[0]?.slice(0, 2) ?? "");
  return (fromName || email.slice(0, 2)).toUpperCase();
}

function sessionFromIdentity(identity: AccessIdentity): Session | null {
  const email = identity.email?.trim();
  if (!email) return null;

  const name = identity.name?.trim() || email.split("@")[0];
  const signedInAt =
    typeof identity.iat === "number" && identity.iat > 0
      ? new Date(identity.iat * 1000).toISOString()
      : new Date().toISOString();

  return {
    id: identity.id ?? email,
    name,
    email,
    initials: initialsFor(name, email),
    role: "Operator",
    signedInAt,
    provider: identity.idp?.type ?? "cloudflare-access",
  };
}

function devSession(): Session {
  const name = "Development Operator";
  return {
    id: "dev:" + DEV_EMAIL,
    name,
    email: DEV_EMAIL,
    initials: initialsFor(name, DEV_EMAIL),
    role: "Operator",
    signedInAt: new Date().toISOString(),
    provider: "development",
  };
}

async function loadSession(): Promise<Session | null> {
  if (import.meta.env.DEV) {
    return devSession();
  }
  const identity = await fetchAccessIdentity();
  return identity ? sessionFromIdentity(identity) : null;
}

/**
 * Resolves the operator once per page load. Router beforeLoad hooks await this
 * so a protected route never renders without an identity.
 */
export function ensureSession(): Promise<Session | null> {
  if (state.status === "authenticated") {
    if (Date.now() - loadedAt < SESSION_TTL_MS) {
      return Promise.resolve(state.session);
    }
    // The cached promise belongs to the stale session; allow a new read.
    // Keep the current session visible while the refresh is in flight.
    state = { status: "loading", session: state.session };
    emit();
    loadPromise = null;
  }
  if (state.status === "unauthenticated") return Promise.resolve(null);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const session = await loadSession();
    loadedAt = Date.now();
    setState(
      session
        ? { status: "authenticated", session }
        : { status: "unauthenticated", session: null },
    );
    return session;
  })();

  return loadPromise;
}

/** Re-reads the Access identity; useful after a session refresh or expiry. */
export function refreshSession(): Promise<Session | null> {
  loadPromise = null;
  loadedAt = 0;
  setState(INITIAL_STATE);
  return ensureSession();
}

export function getSession() {
  return state.session;
}

export function signIn() {
  if (import.meta.env.DEV) {
    const session = devSession();
    setState({ status: "authenticated", session });
    window.location.assign("/");
    return;
  }

  // Re-request the page. Cloudflare Access intercepts the request and shows
  // its login page when the Access cookie is missing or expired.
  window.location.assign(window.location.href);
}

export function signOut() {
  loadPromise = null;
  loadedAt = 0;

  if (import.meta.env.DEV) {
    // There is no Access cookie on localhost. Show the login page; a full
    // reload re-establishes the development identity.
    setState({ status: "unauthenticated", session: null });
    window.location.assign("/login");
    return;
  }

  // Same-origin Access logout revokes the session and clears the cookie. Let
  // the navigation unload the app; do not briefly render the login page first.
  window.location.assign(ACCESS_LOGOUT_PATH);
}

export function useSession() {
  return useSyncExternalStore(
    subscribe,
    () => state.session,
    () => null,
  );
}

export function useAuth() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL_STATE,
  );
}
