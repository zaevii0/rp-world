import { LogIn, LogOut, Mail, Moon, Sparkles, Sun, UserPlus, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { ThemePicker } from "./components/ThemePicker";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { themes, type Appearance, type ThemeId } from "./types/theme";
import type { Profile } from "./types/profile";

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");

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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!supabase || !session?.user) {
        if (active) setProfile(null);
        return;
      }
      const { data, error: profileLoadError } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      if (!active) return;
      if (profileLoadError) {
        setProfileError(profileLoadError.message);
        return;
      }
      setProfile(data as Profile | null);
      if (!data) {
        setUsername("");
        setDisplayName("");
        setBio("");
        setProfileOpen(true);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [session]);

  const isDark = appearance !== "light";
  function resetAuthMessages() { setError(""); setMessage(""); }

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    resetAuthMessages();
    const normalizedEmail = email.trim().toLowerCase();
    const result = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      : await supabase.auth.signUp({ email: normalizedEmail, password });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    if (authMode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to confirm your account.");
    } else {
      setMessage(authMode === "login" ? "Welcome back." : "Account created successfully.");
      setAuthOpen(false);
      setPassword("");
    }
  }

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !session?.user) return;
    setProfileBusy(true);
    setProfileError("");
    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();
    const cleanBio = bio.trim();
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      setProfileError("Username must be 3–24 characters using only lowercase letters, numbers, and underscores.");
      setProfileBusy(false);
      return;
    }
    if (cleanDisplayName.length < 1 || cleanDisplayName.length > 60) {
      setProfileError("Display name must be between 1 and 60 characters.");
      setProfileBusy(false);
      return;
    }
    const { data, error: saveError } = await supabase.from("profiles").upsert(
      { id: session.user.id, username: cleanUsername, display_name: cleanDisplayName, bio: cleanBio },
      { onConflict: "id" },
    ).select("*").single();
    setProfileBusy(false);
    if (saveError) {
      setProfileError(saveError.code === "23505" ? "That username is already taken." : saveError.message);
      return;
    }
    setProfile(data as Profile);
    setProfileOpen(false);
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setProfileOpen(false);
  }

  return (
    <div className={isDark ? "app dark" : "app light"}>
      <header className="topbar glass">
        <div><span className="eyebrow">ROLE PLAY WORLD</span><h1>RP WORLD</h1></div>
        <div className="header-actions">
          <ThemePicker theme={theme} onThemeChange={setTheme} />
          <button className="theme-toggle" type="button" aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={isDark} onClick={() => setAppearance(isDark ? "light" : "dark")}>
            <span className={isDark ? "toggle-thumb dark-thumb" : "toggle-thumb"}>{isDark ? <Moon size={15} /> : <Sun size={15} />}</span>
          </button>
          {session ? (
            <button className="auth-icon-button glass" type="button" aria-label="Sign out" onClick={handleLogout}><LogOut size={17} /></button>
          ) : (
            <button className="auth-icon-button glass" type="button" aria-label="Open account" onClick={() => { setAuthMode("login"); setAuthOpen(true); resetAuthMessages(); }}><LogIn size={17} /></button>
          )}
        </div>
      </header>

      <main className="hero">
        <div className="hero-icon glass"><Sparkles size={28} /></div>
        <p className="eyebrow">{session ? "ACCESS GRANTED" : "FOUNDATION V0.3"}</p>
        <h2>{session ? (profile ? "Welcome, " + profile.display_name + "." : "Build your RP identity.") : "Your RP world. Your identity. Your aesthetic."}</h2>
        <p className="hero-copy">
          {session ? (profile ? "@" + profile.username + (profile.bio ? " · " + profile.bio : "") : "One account, one RP identity, and a profile that belongs to you.") : "A social world where every community can feel different while the experience stays unmistakably RP WORLD."}
        </p>
        {session && !profile && <button className="primary-button" type="button" onClick={() => setProfileOpen(true)}><UserPlus size={17} /> Set up profile</button>}
        {!session && <button className="primary-button" type="button" onClick={() => { setAuthMode("signup"); setAuthOpen(true); resetAuthMessages(); }}><UserPlus size={17} /> Create your account</button>}
        <div className="status glass"><span className="status-dot" />{supabaseConfigured ? (session ? (profile ? "Secure session · profile ready" : "Secure session · profile setup") : "Secure foundation") : "Supabase setup required"}</div>
        {profileError && <p className="form-message error standalone-error">{profileError}</p>}
      </main>

      {authOpen && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setAuthOpen(false)}>
          <section className="auth-sheet glass" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header"><div><p className="eyebrow">RP WORLD ACCESS</p><h2 id="auth-title">{authMode === "login" ? "Welcome back." : "Create your identity."}</h2></div><button className="icon-button" type="button" aria-label="Close" onClick={() => setAuthOpen(false)}><X size={18} /></button></div>
            <p className="sheet-copy">{authMode === "login" ? "Sign in to continue to RP WORLD." : "Start with your email and a secure password. You can build your RP identity after access is confirmed."}</p>
            {!supabaseConfigured ? (
              <div className="setup-notice"><strong>Supabase is not connected yet.</strong><span>Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your environment variables.</span></div>
            ) : (
              <form className="auth-form" onSubmit={handleAuth}>
                <label><span>Email</span><div className="input-wrap"><Mail size={16} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></div></label>
                <label><span>Password</span><div className="input-wrap"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={6} required /></div></label>
                {error && <p className="form-message error">{error}</p>}
                {message && <p className="form-message success">{message}</p>}
                <button className="primary-button full" type="submit" disabled={busy}>{busy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}</button>
              </form>
            )}
            <button className="mode-switch" type="button" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); resetAuthMessages(); }}>{authMode === "login" ? "New to RP WORLD? Create an account" : "Already have an account? Sign in"}</button>
          </section>
        </div>
      )}

      {profileOpen && session && (
        <div className="sheet-backdrop" role="presentation">
          <section className="profile-sheet glass" role="dialog" aria-modal="true" aria-labelledby="profile-title">
            <div className="sheet-header">
              <div><p className="eyebrow">RP WORLD IDENTITY</p><h2 id="profile-title">Build your profile.</h2></div>
              {profile && <button className="icon-button" type="button" aria-label="Close" onClick={() => setProfileOpen(false)}><X size={18} /></button>}
            </div>
            <p className="sheet-copy">Choose the identity people will see inside RP WORLD. Your email stays private and is not used as your public username.</p>
            <form className="auth-form" onSubmit={handleProfileSubmit}>
              <label><span>Username</span><div className="input-wrap"><span className="input-prefix">@</span><input type="text" value={username} onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())} placeholder="yourname" autoComplete="username" maxLength={24} required /></div></label>
              <label><span>Display name</span><div className="input-wrap"><input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your RP name" maxLength={60} required /></div></label>
              <label><span>Bio <small>optional</small></span><div className="input-wrap textarea-wrap"><textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="A short line about your RP identity." maxLength={160} rows={3} /></div></label>
              {profileError && <p className="form-message error">{profileError}</p>}
              <button className="primary-button full" type="submit" disabled={profileBusy}>{profileBusy ? "Saving…" : profile ? "Save changes" : "Continue"}</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
