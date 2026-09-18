import { FormEvent, useState } from "react";
import { Mail, LockKeyhole, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";

type Mode = "signin" | "signup";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!supabase) {
    return (
      <main className="auth-shell">
        <section className="auth-card glass">
          <span className="eyebrow">RP WORLD</span>
          <h1>Connect your Supabase project</h1>
          <p className="auth-copy">Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your local .env file before testing authentication.</p>
        </section>
      </main>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const result = mode === "signup"
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });

    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to verify your account, then return to RP WORLD and sign in.");
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card glass">
        <div className="auth-brand">
          <span className="eyebrow">ROLE PLAY WORLD</span>
          <h1>RP WORLD</h1>
          <p>Your identity. Your people. Your world.</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Authentication">
          <button type="button" className={mode === "signin" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("signin"); setMessage(""); }}>
            Sign In
          </button>
          <button type="button" className={mode === "signup" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("signup"); setMessage(""); }}>
            Create Account
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Email</span>
            <div className="input-wrap">
              <Mail size={17} aria-hidden="true" />
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="At least 8 characters" />
            </div>
          </label>

          {message && <p className="auth-message" role="status">{message}</p>}

          <button className="primary-button auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Enter RP WORLD" : "Create Account"}
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="auth-footnote">Email verification is required before your RP identity can be completed.</p>
      </section>
    </main>
  );
}
