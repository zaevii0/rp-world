import { Moon, Sparkles, Sun } from "lucide-react";
import { useState } from "react";

export function App() {
  const [dark, setDark] = useState(true);

  return (
    <div className={dark ? "app dark" : "app light"}>
      <header className="topbar glass">
        <div>
          <span className="eyebrow">ROLE PLAY WORLD</span>
          <h1>RP WORLD</h1>
        </div>

        <button
          className="theme-toggle"
          type="button"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={dark}
          onClick={() => setDark((value) => !value)}
        >
          <span className={dark ? "toggle-thumb dark-thumb" : "toggle-thumb"}>
            {dark ? <Moon size={15} /> : <Sun size={15} />}
          </span>
        </button>
      </header>

      <main className="hero">
        <div className="hero-icon glass">
          <Sparkles size={28} />
        </div>
        <p className="eyebrow">FOUNDATION V0.1</p>
        <h2>A social world built for role players.</h2>
        <p className="hero-copy">
          The secure foundation is now in place. Feed, Hoods, profiles,
          messaging, stories, news, and community systems will be added
          incrementally.
        </p>
        <div className="status glass">
          <span className="status-dot" />
          Foundation online
        </div>
      </main>
    </div>
  );
}
