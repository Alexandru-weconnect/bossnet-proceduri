import { useEffect, useState } from "react";
import { LoginView } from "./components/LoginView";
import { TitleBar } from "./components/TitleBar";
import { Workspace } from "./components/Workspace";
import { clearSession, createSession, readSession } from "./lib/storage";
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

  function handleAuthenticated(email: string) {
    setSession(createSession(email));
  }

  function handleLogout() {
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
