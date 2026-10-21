import { useSyncExternalStore } from "react";

export type Session = {
  name: string;
  email: string;
  initials: string;
  role: string;
  signedInAt: string;
};

const STORAGE_KEY = "bo-session";

const DEMO_SESSION: Session = {
  name: "MemeChat Operator",
  email: "operator@memechat.app",
  initials: "MO",
  role: "Operator",
  signedInAt: new Date().toISOString(),
};

function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Session> | null;
    if (!value || typeof value.name !== "string" || typeof value.email !== "string") {
      return null;
    }
    return {
      name: value.name,
      email: value.email,
      initials: value.initials ?? "MO",
      role: value.role ?? "Operator",
      signedInAt: value.signedInAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function readSession(): Session | null {
  try {
    return parseSession(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

let currentSession: Session | null = readSession();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function persist(session: Session | null) {
  currentSession = session;
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
  emit();
}

export function getSession() {
  return currentSession;
}

export function signInDemo() {
  persist({ ...DEMO_SESSION, signedInAt: new Date().toISOString() });
}

export function signOut() {
  persist(null);
}

export function useSession() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => currentSession,
    () => null,
  );
}
