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
        </div>
      </header>

      <main className="hero">
        <div className="hero-icon glass"><Sparkles size={28} /></div>
        <p className="eyebrow">FOUNDATION V0.1</p>
        <h2>Your RP world. Your identity. Your aesthetic.</h2>
        <p className="hero-copy">
          A social world where every community can feel different while the
          experience stays unmistakably RP WORLD.
        </p>
        <div className="status glass"><span className="status-dot" />Secure foundation</div>
      </main>
    </div>
  );
}
