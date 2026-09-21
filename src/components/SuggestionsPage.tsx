import { Lightbulb, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type SuggestionsPageProps = {
  session: Session;
};

export function SuggestionsPage({ session }: SuggestionsPageProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Feature");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submitSuggestion(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setError("Suggestions are unavailable because RP WORLD is not connected to Supabase.");
      return;
    }

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle || !cleanDescription) {
      setError("Please complete the title and description.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    const { error: insertError } = await supabase.from("suggestions").insert({
      user_id: session.user.id,
      title: cleanTitle,
      category,
      description: cleanDescription,
    });

    setBusy(false);

    if (insertError) {
      setError("Your suggestion could not be sent right now. Please try again.");
      return;
    }

    setTitle("");
    setCategory("Feature");
    setDescription("");
    setMessage("Suggestion sent. Thank you for helping shape RP WORLD.");
  }

  return (
    <section className="suggestions-page">
      <div className="suggestions-card glass">
        <div className="suggestions-header">
          <div className="suggestions-icon" aria-hidden="true">
            <Lightbulb size={24} />
          </div>
          <div>
            <p className="eyebrow">RP WORLD FEEDBACK</p>
            <h2>Help shape RP WORLD.</h2>
          </div>
        </div>

        <p className="suggestions-copy">
          Have an idea for something RP WORLD should add or improve? Send it here.
          Your suggestions will be reviewed as development continues.
        </p>

        <form className="auth-form" onSubmit={submitSuggestion}>
          <label>
            <span>Suggestion title</span>
            <div className="input-wrap">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Add profile music"
                maxLength={100}
                required
              />
            </div>
          </label>

          <label>
            <span>Category</span>
            <div className="input-wrap">
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>Feature</option>
                <option>Improvement</option>
                <option>Design</option>
                <option>Bug / Issue</option>
                <option>Other</option>
              </select>
            </div>
          </label>

          <label>
            <span>Details</span>
            <div className="input-wrap textarea-wrap">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell us what you would like to see in RP WORLD and how it could work."
                maxLength={2000}
                rows={7}
                required
              />
            </div>
          </label>

          {error && <p className="form-message error">{error}</p>}
          {message && <p className="form-message success">{message}</p>}

          <button className="primary-button full" type="submit" disabled={busy}>
            {busy ? "Sending…" : <><Send size={16} /> Send suggestion</>}
          </button>
        </form>
      </div>
    </section>
  );
}
