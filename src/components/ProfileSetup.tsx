import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";
import { themes, type ThemeId } from "../types/theme";

interface ProfileSetupProps {
  onComplete: () => void;
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState<ThemeId>("midnight");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("create_my_profile", {
      p_username: username.trim().toLowerCase(),
      p_display_name: displayName.trim(),
      p_bio: bio.trim() || null,
      p_theme_id: theme,
    });

    setBusy(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    onComplete();
  }

  return (
    <main className="auth-shell">
      <section className="profile-setup-card glass">
        <span className="eyebrow">RP WORLD · IDENTITY</span>
        <h1>Create your RP identity.</h1>
        <p className="auth-copy">Your RP ID will be generated securely by RP WORLD. You can customize the rest of your profile later.</p>

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Username</span>
            <input className="plain-input" value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={30} pattern="[a-z0-9_]+" required placeholder="yourusername" />
          </label>

          <label>
            <span>Display name</span>
            <input className="plain-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} required placeholder="Your RP name" />
          </label>

          <label>
            <span>Bio <small>(optional)</small></span>
            <textarea className="plain-input" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={3} placeholder="Tell people about your RP identity…" />
          </label>

          <div>
            <span className="form-label">Choose your theme</span>
            <div className="setup-themes">
              {themes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={theme === item.id ? "setup-theme selected" : "setup-theme"}
                  style={{ "--theme-accent": item.accent, "--theme-soft": item.accentSoft } as React.CSSProperties}
                  onClick={() => setTheme(item.id)}
                  aria-pressed={theme === item.id}
                >
                  <span className="theme-orb" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="auth-message error" role="alert">{error}</p>}

          <button className="primary-button auth-submit" type="submit" disabled={busy}>
            {busy ? "Creating identity…" : "Create my RP identity"}
          </button>
        </form>
      </section>
    </main>
  );
}
