import { Moon, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemePicker } from "./components/ThemePicker";
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

const demoProfile = {
  name: "Your RP Identity",
  username: "@yourusername",
  bio: "Create your identity, find your people, and build your RP world.",
  rpId: "RPW-0000000000",
  followers: "1.2K",
  following: "248",
};

const demoPosts = [
  { id: 1, title: "Welcome to RP WORLD", text: "A place for every RP identity, aesthetic, and community.", meta: "Just now · Public" },
  { id: 2, title: "Your aesthetic, your rules", text: "Choose a theme and let your profile feel like yours.", meta: "Today · Public" },
];

export function App() {
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  const [appearance, setAppearance] = useState<Appearance>(readAppearance);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(APPEARANCE_KEY, appearance);
    document.documentElement.dataset.appearance = appearance;
  }, [appearance]);

  const isDark = appearance === "dark";

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
        </div>
      </header>

      <main className="rpw-shell">
        <section className="profile-card glass">
          <div className="profile-cover" aria-hidden="true">
            <div className="cover-glow" />
          </div>
          <div className="profile-body">
            <div className="profile-avatar">RP</div>
            <div className="profile-heading">
              <div>
                <span className="profile-kicker">ROLE PLAYER</span>
                <h2>{demoProfile.name}</h2>
                <p className="profile-username">{demoProfile.username} · {demoProfile.rpId}</p>
              </div>
              <span className="verified-badge" title="Verified identity"><span>✓</span> Verified</span>
            </div>
            <p className="profile-bio">{demoProfile.bio}</p>
            <div className="profile-stats">
              <span><strong>{demoProfile.followers}</strong> Followers</span>
              <span><strong>{demoProfile.following}</strong> Following</span>
              <span><strong>3</strong> Hoods</span>
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
            <p>Every surface uses your selected theme, from profile accents to feed cards and actions.</p>
            <div className="accent-preview"><span /> {themes.find((item) => item.id === theme)?.label} theme</div>
          </aside>

          <div className="feed">
            <div className="section-heading">
              <div>
                <span className="eyebrow">TIMELINE</span>
                <h3>Your Feed</h3>
              </div>
              <button className="secondary-button compact" type="button">Create Post</button>
            </div>
            {demoPosts.map((post) => (
              <article className="post-card glass" key={post.id}>
                <div className="post-author">
                  <div className="mini-avatar">RP</div>
                  <div><strong>{demoProfile.name}</strong><span>{post.meta}</span></div>
                </div>
                <h4>{post.title}</h4>
                <p>{post.text}</p>
                <div className="post-actions">
                  <button type="button">♡ Like</button>
                  <button type="button">◌ Comment</button>
                  <button type="button">↗ Share</button>
                  <button type="button">⌑ Save</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
