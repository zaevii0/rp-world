import { Moon, Sun, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ThemePicker } from "./components/ThemePicker";
import { AuthScreen } from "./components/AuthScreen";
import { ProfileSetup } from "./components/ProfileSetup";
import { supabase } from "./lib/supabase";
import { themes, type Appearance, type ThemeId } from "./types/theme";

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
  const [sessionReady, setSessionReady] = useState(!supabase);
  const [signedIn, setSignedIn] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

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

    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      await handleSession(data.session);
      setSessionReady(true);
    }

    async function handleSession(currentSession: Session | null) {
      setSignedIn(Boolean(currentSession));
      if (!currentSession) {
        setProfile(null);
        setHasProfile(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, cover_url, rp_id, theme_id, profile_visibility")
        .eq("id", currentSession.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (data) {
        setProfile(data);
        setTheme((data.theme_id as ThemeId) || "midnight");
        setHasProfile(true);
      } else {
        setProfile(null);
        setHasProfile(false);
      }
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      void handleSession(currentSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const isDark = appearance === "dark";

  if (!sessionReady) {
    return <div className="loading-screen">Loading RP WORLD…</div>;
  }

  if (!supabase || !signedIn) {
    return (
      <div className={isDark ? "app dark" : "app light"}>
        <AuthScreen />
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className={isDark ? "app dark" : "app light"}>
        <ProfileSetup onComplete={() => window.location.reload()} />
      </div>
    );
  }

  const displayName = String(profile?.display_name ?? "Your RP Identity");
  const username = String(profile?.username ?? "yourusername");
  const rpId = String(profile?.rp_id ?? "RPW-UNKNOWN");
  const bio = String(profile?.bio ?? "Create your identity, find your people, and build your RP world.");

  async function signOut() {
    await supabase?.auth.signOut();
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
          <button className="theme-toggle" type="button" aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={isDark} onClick={() => setAppearance(isDark ? "light" : "dark")}>
            <span className={isDark ? "toggle-thumb dark-thumb" : "toggle-thumb"}>
              {isDark ? <Moon size={15} /> : <Sun size={15} />}
            </span>
          </button>
          <button className="icon-button glass" type="button" aria-label="Sign out" onClick={signOut}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="rpw-shell">
        <section className="profile-card glass">
          <div className="profile-cover" aria-hidden="true"><div className="cover-glow" /></div>
          <div className="profile-body">
            <div className="profile-avatar">RP</div>
            <div className="profile-heading">
              <div>
                <span className="profile-kicker">ROLE PLAYER</span>
                <h2>{displayName}</h2>
                <p className="profile-username">@{username} · {rpId}</p>
              </div>
              <span className="verified-badge"><span>✓</span> RP Identity</span>
            </div>
            <p className="profile-bio">{bio}</p>
            <div className="profile-stats">
              <span><strong>0</strong> Followers</span>
              <span><strong>0</strong> Following</span>
              <span><strong>0</strong> Hoods</span>
            </div>
            <div className="profile-actions">
              <button className="primary-button" type="button">Edit Profile</button>
              <button className="secondary-button" type="button">Share Profile</button>
            </div>
          </div>
        </section>

        <section className="content-grid">
          <aside className="side-card glass">
            <span className="eyebrow">YOUR RP WORLD</span>
            <h3>Identity & aesthetic</h3>
            <p>Your profile theme is saved to your RP WORLD account, so it can follow you across devices.</p>
            <div className="accent-preview"><span /> {themes.find((item) => item.id === theme)?.label} theme</div>
          </aside>

          <div className="feed">
            <div className="section-heading">
              <div><span className="eyebrow">TIMELINE</span><h3>Your Feed</h3></div>
              <button className="secondary-button compact" type="button">Create Post</button>
            </div>
            <article className="post-card glass">
              <div className="post-author"><div className="mini-avatar">RP</div><div><strong>{displayName}</strong><span>Welcome to RP WORLD · Public</span></div></div>
              <h4>Your RP WORLD starts here.</h4>
              <p>Identity foundation is connected. Posts, Hoods, messaging, and the rest of RP WORLD will be built on this account.</p>
              <div className="post-actions"><button type="button">♡ Like</button><button type="button">◌ Comment</button><button type="button">↗ Share</button><button type="button">⌑ Save</button></div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
