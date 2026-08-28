import { useEffect, useState } from "react";
import { LoginView } from "./components/LoginView";
import { TitleBar } from "./components/TitleBar";
import { Workspace } from "./components/Workspace";
import { endServerSession, validateServerSession } from "./lib/api";
import { clearSession, readSession, saveSession } from "./lib/storage";
import type { BossnetSession } from "./types";

export default function App() {
  const [session, setSession] = useState<BossnetSession | null>(() => readSession());

  useEffect(() => {
    if (!session) return;

    const remaining = Math.max(0, session.expiresAt - Date.now());
    const timeoutId = window.setTimeout(() => {
      clearSession();
      setSession(null);
    }, remaining);

    return () => window.clearTimeout(timeoutId);
  }, [session]);

  useEffect(() => {
    if (!session?.token) return;
    let cancelled = false;

    void validateServerSession(session.token).catch(() => {
      if (cancelled) return;
      clearSession();
      setSession(null);
    });

    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  function handleAuthenticated(nextSession: BossnetSession) {
    setSession(saveSession(nextSession));
  }

  function handleLogout() {
    if (session?.token) void endServerSession(session.token).catch(() => undefined);
    clearSession();
    setSession(null);
  }

  return (
    <div className="app-frame">
      <TitleBar />
      <div className="app-surface">
        {session ? (
          <Workspace session={session} onLogout={handleLogout} />
        ) : (
          <LoginView onAuthenticated={handleAuthenticated} />
        )}
      </div>
    </div>
  );
}
