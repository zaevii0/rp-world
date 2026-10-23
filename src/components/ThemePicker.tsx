import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, LockKeyhole, Paintbrush, X } from "lucide-react";
import { themes, type ThemeId } from "../types/theme";

interface ThemePickerProps {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  canUseAllThemes?: boolean;
  allThemesUnlocked?: boolean;
  onLockedTheme?: () => void;
  menuPlacement?: boolean;
}

type ThemeCardStyle = CSSProperties & {
  "--theme-accent": string;
  "--theme-soft": string;
};

export function ThemePicker({ theme, onThemeChange, canUseAllThemes = true, allThemesUnlocked = false, onLockedTheme, menuPlacement = false }: ThemePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={menuPlacement ? "theme-trigger menu-theme-trigger" : "theme-trigger glass"}
        type="button"
        aria-label="Choose RP World theme"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="theme-trigger-icon" aria-hidden="true">
          <Paintbrush size={17} strokeWidth={2.15} />
        </span>
        {menuPlacement && <span>Appearance &amp; themes</span>}
      </button>

      {open &&
        createPortal(
          <div className="sheet-backdrop" role="presentation" onClick={() => setOpen(false)}>
            <section
            className="theme-sheet glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-header">
              <div>
                <p className="eyebrow">RP WORLD</p>
                <h2 id="theme-title">Make it yours.</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close theme picker"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="sheet-copy">
              Change the atmosphere without changing the RP WORLD experience.
            </p>

            <div className="theme-grid">
              {themes.map((item) => {
                const locked = !allThemesUnlocked && !canUseAllThemes && item.id !== "black" && item.id !== "sage" && item.id !== "powder-blue";
                return (
                  <button
                    className={item.id === theme ? `theme-card selected${locked ? " locked" : ""}` : `theme-card${locked ? " locked" : ""}`}
                    key={item.id}
                    type="button"
                    style={
                      {
                        "--theme-accent": item.accent,
                        "--theme-soft": item.accentSoft,
                      } as ThemeCardStyle
                    }
                    onClick={() => {
                      if (locked) {
                        onLockedTheme?.();
                        return;
                      }
                      onThemeChange(item.id);
                      setOpen(false);
                    }}
                    aria-disabled={locked}
                  >
                    <span className="theme-orb" />
                    <span>{item.label}</span>
                    {locked ? <LockKeyhole size={14} aria-hidden="true" /> : item.id === theme && <Check size={15} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
