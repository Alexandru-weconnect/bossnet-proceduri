import { useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  authenticateWithGoogle,
  GOOGLE_CLIENT_ID,
  MOCK_AUTH_ENABLED,
  type GoogleAuthorization,
} from "../lib/api";
import { createMockSession } from "../lib/storage";
import type { BossnetSession } from "../types";
import { BrandMark } from "./BrandMark";
import { Glyph } from "./Glyph";

const BOSSNET_EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@bossnet\.ro$/i;

interface LoginViewProps {
  onAuthenticated: (session: BossnetSession) => void;
}

type AuthStage = "idle" | "browser" | "server";

const AUTH_STAGE_COPY: Record<Exclude<AuthStage, "idle">, { button: string; message: string }> = {
  browser: {
    button: "AȘTEPT CONFIRMAREA GOOGLE",
    message: "Finalizează autentificarea în browser. Revenirea în aplicație este automată.",
  },
  server: {
    button: "CONECTEZ SESIUNEA",
    message: "Google a confirmat contul. Se creează sesiunea Bossnet de 24 de ore.",
  },
};

function authErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message.trim()) return error.message;
  if (
    typeof error === "object"
    && error !== null
    && "message" in error
    && typeof error.message === "string"
    && error.message.trim()
  ) {
    return error.message;
  }
  return "Autentificarea nu a reușit. Reîncearcă din aplicație.";
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function GoogleGlyph() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 18 18" width="18">
      <path d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.798 2.716v2.258h2.909c1.702-1.567 2.685-3.875 2.685-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.468-.806 5.955-2.18l-2.91-2.258c-.805.54-1.835.86-3.045.86-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.963 10.708A5.42 5.42 0 0 1 3.68 9c0-.593.102-1.17.283-1.708V4.96H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.04l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.578c1.322 0 2.508.454 3.441 1.346l2.582-2.582C13.464.89 11.426 0 9 0A9 9 0 0 0 .956 4.96l3.007 2.332C4.672 5.163 6.656 3.578 9 3.578Z" fill="#EA4335" />
    </svg>
  );
}

export function LoginView({ onAuthenticated }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [authStage, setAuthStage] = useState<AuthStage>("idle");
  const isLoading = authStage !== "idle";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      if (GOOGLE_CLIENT_ID) {
        if (!isTauriRuntime()) {
          throw new Error("Loginul Google se deschide din aplicația Windows instalată.");
        }
        setAuthStage("browser");
        const oauth = await invoke<GoogleAuthorization>("google_oauth_login", {
          clientId: GOOGLE_CLIENT_ID,
          hostedDomain: "bossnet.ro",
        });
        setAuthStage("server");
        onAuthenticated(await authenticateWithGoogle(oauth));
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!MOCK_AUTH_ENABLED) {
        throw new Error("Clientul Google OAuth nu este configurat în acest build.");
      }
      if (!BOSSNET_EMAIL.test(normalizedEmail)) {
        throw new Error("Folosește o adresă validă care se termină în @bossnet.ro.");
      }

      setAuthStage("server");
      await new Promise((resolve) => window.setTimeout(resolve, 420));
      onAuthenticated(createMockSession(normalizedEmail));
    } catch (caughtError) {
      setError(authErrorMessage(caughtError));
      setAuthStage("idle");
    }
  }

  const statusMessage = error
    || (authStage === "idle"
      ? "Sesiunea rămâne activă 24 de ore."
      : AUTH_STAGE_COPY[authStage].message);
  const buttonLabel = authStage === "idle"
    ? "CONTINUĂ CU GOOGLE"
    : AUTH_STAGE_COPY[authStage].button;
  const showAuthFeedback = !GOOGLE_CLIENT_ID || Boolean(error) || isLoading;

  return (
    <main className="login" aria-labelledby="login-title">
      <section className="login__manifesto">
        <div className="login__watermark" aria-hidden="true">B/P</div>
        <div className="login__copy">
          <p className="eyebrow"><span /> CONTROL INTERN</p>
          <h1 id="login-title">PROCEDURI<br />INTERNE</h1>
          <p className="login__update">Last update: v0.4 MAHMURIA</p>
        </div>
        <div className="login__index" aria-hidden="true">
          <span>01</span>
          <div><i /><i /><i /></div>
          <span>04</span>
        </div>
      </section>

      <section className="login__access">
        <div className="login-card">
          <BrandMark className="login-card__mark" />
          <div className="login-card__heading">
            <span className="micro-label">ACCES SECURIZAT</span>
            <h2>BOSSNET<br />PROCEDURI</h2>
            <p>Intră cu identitatea de lucru Bossnet.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {!GOOGLE_CLIENT_ID ? (
              <>
                <label htmlFor="email">EMAIL BOSSNET</label>
                <div className={`input-shell ${error ? "input-shell--error" : ""}`}>
                  <Glyph name="user" size={18} />
                  <input
                    autoComplete="email"
                    id="email"
                    inputMode="email"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError("");
                    }}
                    spellCheck="false"
                    type="email"
                    value={email}
                  />
                  <span>DOMENIU INTERN</span>
                </div>
              </>
            ) : null}
            {showAuthFeedback ? (
              <div
                className={`field-message ${isLoading ? "field-message--active" : ""}`}
                aria-live="polite"
              >
                {statusMessage}
              </div>
            ) : null}

            <button
              aria-busy={isLoading}
              className="google-button"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? <span className="button-loader" /> : <GoogleGlyph />}
              <span>{buttonLabel}</span>
              <Glyph name="arrow" size={17} />
            </button>
          </form>

          <div className="login-card__status">
            <span>
              <i />
              <span>{GOOGLE_CLIENT_ID ? "Doar utilizatorii bossnet sunt autorizati" : "MOD TEST"}</span>
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
