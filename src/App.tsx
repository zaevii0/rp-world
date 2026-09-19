import { LogIn, LogOut, Mail, Moon, Sparkles, Sun, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemePicker } from "./components/ThemePicker";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { themes, type Appearance, type ThemeId } from "./types/theme";
import type { Session } from "@supabase/supabase-js";

const THEME_KEY = "rpw-theme";
const APPEARANCE_KEY = "rpw-appearance";

function readTheme(): ThemeId {
  const saved = localStorage.getItem(THEME_KEY);
  return themes.some((theme) => theme.id === saved) ? (saved as ThemeId) : "midnight";
}

function readAppearance(): Appearance {
  const saved = localStorage.getItem(APPEARANCE_KEY);
  return saved === "light" || saved === "system" ? saved : "dark";
}

export function App() {
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  const [appearance, setAppearance] = useState<Appearance>(readAppearance);
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(APPEARANCE_KEY, appearance);
    document.documentElement.dataset.appearance = appearance;
  }, [appearance]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const isDark = appearance !== "light";

  async function handleAuth(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setError("");
    setMessage("");

    const result =
      authMode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setBusy(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (authMode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to confirm your account.");
    } else {
      setMessage(authMode === "login" ? "Welcome back." : "Account created successfully.");
      setAuthOpen(false);
      setPassword("");
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  }

  return (
    <div className={isDark ? "app dark" : "app light"}>
      <header className="topbar glass">
        <div>
          <span className="eyebrow">ROLE PLAY WORLD</span>
          <h1>RP WORLD</h1>
        </div>

        <div className="header-actions">
          <ThemePicker theme={theme} onThemeChange={setTheme} />

          <button
            className="theme-toggle"
            type="button"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={isDark}
            onClick={() => setAppearance(isDark ? "light" : "dark")}
          >
            <span className={isDark ? "toggle-thumb dark-thumb" : "toggle-thumb"}>
              {isDark ? <Moon size={15} /> : <Sun size={15} />}
            </span>
          </button>

          {session ? (
            <button className="auth-icon-button glass" type="button" aria-label="Sign out" onClick={handleLogout}>
              <LogOut size={17} />
            </button>
          ) : (
            <button
              className="auth-icon-button glass"
              type="button"
              aria-label="Open account"
              onClick={() => {
                setAuthMode("login");
                setAuthOpen(true);
                setError("");
                setMessage("");
              }}
            >
              <LogIn size={17} />
            </button>
          )}
        </div>
      </header>

      <main className="hero">
        <div className="hero-icon glass"><Sparkles size={28} /></div>
        <p className="eyebrow">{session ? "ACCESS GRANTED" : "FOUNDATION V0.2"}</p>
        <h2>{session ? "Welcome to your RP world." : "Your RP world. Your identity. Your aesthetic."}</h2>
        <p className="hero-copy">
          {session
            ? `Signed in as ${session.user.email}. Your personalized RP WORLD experience starts here.`
            : "A social world where every community can feel different while the experience stays unmistakably RP WORLD."}
        </p>

        {!session && (
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setAuthMode("signup");
              setAuthOpen(true);
              setError("");
              setMessage("");
            }}
          >
            <UserPlus size={17} /> Create your account
          </button>
        )}

        <div className="status glass">
          <span className="status-dot" />
          {supabaseConfigured ? (session ? "Secure session active" : "Secure foundation") : "Supabase setup required"}
        </div>
      </main>

      {authOpen && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setAuthOpen(false)}>
          <section
            className="auth-sheet glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-header">
              <div>
                <p className="eyebrow">RP WORLD ACCESS</p>
                <h2 id="auth-title">{authMode === "login" ? "Welcome back." : "Create your identity."}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close" onClick={() => setAuthOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p className="sheet-copy">
              {authMode === "login"
                ? "Sign in to continue to RP WORLD."
                : "Start with your email and a secure password. You can build your RP identity after access is confirmed."}
            </p>

            {!supabaseConfigured ? (
              <div className="setup-notice">
                <strong>Supabase is not connected yet.</strong>
                <span>Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your environment variables.</span>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleAuth}>
                <label>
                  <span>Email</span>
                  <div className="input-wrap">
                    <Mail size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </label>

                <label>
                  <span>Password</span>
                  <div className="input-wrap">
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete={authMode === "login" ? "current-password" : "new-password"}
                      minLength={6}
                      required
                    />
                  </div>
                </label>

                {error && <p className="form-message error">{error}</p>}
                {message && <p className="form-message success">{message}</p>}

                <button className="primary-button full" type="submit" disabled={busy}>
                  {busy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}
                </button>
              </form>
            )}

            <button
              className="mode-switch"
              type="button"
              onClick={() => {
                setAuthMode(authMode === "login" ? "signup" : "login");
                setError("");
                setMessage("");
              }}
            >
              {authMode === "login" ? "New to RP WORLD? Create an account" : "Already have an account? Sign in"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
