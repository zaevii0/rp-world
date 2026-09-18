import { useState } from "react";
import { Check, Palette, X } from "lucide-react";
import { themes, type ThemeId } from "../types/theme";

interface ThemePickerProps {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}

export function ThemePicker({ theme, onThemeChange }: ThemePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="icon-button glass" type="button" aria-label="Customize RP World theme" aria-expanded={open} onClick={() => setOpen(true)}>
        <Palette size={17} />
      </button>

      {open && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <section className="theme-sheet glass" role="dialog" aria-modal="true" aria-labelledby="theme-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <div>
                <p className="eyebrow">RP WORLD</p>
                <h2 id="theme-title">Make it yours.</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close theme picker" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="sheet-copy">Choose an aesthetic while keeping the same RP WORLD design language.</p>
            <div className="theme-grid">
              {themes.map((item) => (
                <button
                  className={item.id === theme ? "theme-card selected" : "theme-card"}
                  key={item.id}
                  type="button"
                  style={{ "--theme-accent": item.accent, "--theme-soft": item.accentSoft } as React.CSSProperties}
                  onClick={() => { onThemeChange(item.id); setOpen(false); }}
                >
                  <span className={`theme-orb theme-orb-${item.id}`} />
                  <span>{item.label}</span>
                  {item.id === theme && <Check size={15} aria-hidden="true" />}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
