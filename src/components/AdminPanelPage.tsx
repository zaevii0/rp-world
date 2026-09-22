import { Check, Clock3, Filter, RefreshCw, Heart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types/profile";

type SuggestionStatus = "pending" | "reviewing" | "planned" | "implemented" | "declined";
type SuggestionCategory = "Feature" | "Improvement" | "Design" | "Bug / Issue" | "Other";
type SupportStatus = "pending" | "paid" | "cancelled" | "refunded";
type SupportIntent = { id: string; user_id: string; amount: number; currency: string; frequency: "one_time" | "monthly"; note: string | null; status: SupportStatus; provider: string | null; provider_reference: string | null; created_at: string; updated_at: string; };

type Suggestion = {
  id: string;
  user_id: string;
  title: string;
  category: SuggestionCategory;
  description: string;
  status: SuggestionStatus;
  created_at: string;
  updated_at: string;
};

const statuses: Array<{ value: SuggestionStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "planned", label: "Planned" },
  { value: "implemented", label: "Implemented" },
  { value: "declined", label: "Declined" },
];

const categories = ["all", "Feature", "Improvement", "Design", "Bug / Issue", "Other"] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminPanelPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [supportIntents, setSupportIntents] = useState<SupportIntent[]>([]);
  const [supportStatusFilter, setSupportStatusFilter] = useState<"all" | SupportStatus>("all");
  const [activeSection, setActiveSection] = useState<"suggestions" | "support">("suggestions");
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | SuggestionStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<(typeof categories)[number]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadSupportIntents() {
    if (!supabase) return;
    const { data, error: loadError } = await supabase.from("support_intents").select("id, user_id, amount, currency, frequency, note, status, provider, provider_reference, created_at, updated_at").order("created_at", { ascending: false });
    if (loadError) { setError(loadError.message || "Support requests could not be loaded."); return; }
    setSupportIntents((data ?? []) as SupportIntent[]);
  }

  async function loadSuggestions() {
    if (!supabase) return;
    setRefreshing(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("suggestions")
      .select("id, user_id, title, category, description, status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message || "Suggestions could not be loaded.");
      setRefreshing(false);
      return;
    }

    const rows = (data ?? []) as Suggestion[];
    setSuggestions(rows);
    await loadSupportIntents();

    const userIds = [...new Set(rows.map((row) => row.user_id))];
    if (userIds.length) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      const nextProfiles: Record<string, Profile> = {};
      (profileRows ?? []).forEach((item) => {
        const profile = item as Profile;
        nextProfiles[profile.id] = profile;
      });
      setProfiles(nextProfiles);
    } else {
      setProfiles({});
    }

    setRefreshing(false);
  }

  useEffect(() => {
    void loadSuggestions();
  }, []);

  async function updateSupportStatus(id: string, status: SupportStatus) {
    if (!supabase) return;
    setBusyId(id); setMessage(""); setError("");
    const { data, error: updateError } = await supabase.from("support_intents").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("id, status, updated_at").single();
    setBusyId(null);
    if (updateError || !data) { setError(updateError?.message || "The support status could not be updated."); return; }
    setSupportIntents((current) => current.map((item) => item.id === id ? { ...item, status: data.status as SupportStatus, updated_at: data.updated_at } : item));
    setMessage("Support status updated.");
  }

  async function updateStatus(id: string, status: SuggestionStatus) {
    if (!supabase) return;
    setBusyId(id);
    setMessage("");
    setError("");

    const { data, error: updateError } = await supabase
      .from("suggestions")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, status, updated_at")
      .single();

    setBusyId(null);

    if (updateError || !data) {
      setError(updateError?.message || "The suggestion status could not be updated.");
      return;
    }

    setSuggestions((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: data.status as SuggestionStatus, updated_at: data.updated_at }
          : item,
      ),
    );
    setMessage("Suggestion status updated.");
  }

  const filteredSupportIntents = useMemo(() => supportIntents.filter((item) => supportStatusFilter === "all" || item.status === supportStatusFilter), [supportIntents, supportStatusFilter]);
  const supportCounts = useMemo(() => ({ pending: supportIntents.filter((x) => x.status === "pending").length, paid: supportIntents.filter((x) => x.status === "paid").length, cancelled: supportIntents.filter((x) => x.status === "cancelled").length, refunded: supportIntents.filter((x) => x.status === "refunded").length }), [supportIntents]);
  const supportTotals = useMemo(() => ({
    pending: supportIntents.filter((x) => x.status === "pending").reduce((s, x) => s + Number(x.amount), 0),
    paid: supportIntents.filter((x) => x.status === "paid").reduce((s, x) => s + Number(x.amount), 0),
  }), [supportIntents]);

  const filteredSuggestions = useMemo(
    () =>
      suggestions.filter((item) => {
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
        return matchesStatus && matchesCategory;
      }),
    [suggestions, statusFilter, categoryFilter],
  );

  const counts = useMemo(
    () =>
      statuses.reduce(
        (result, item) => ({ ...result, [item.value]: suggestions.filter((suggestion) => suggestion.status === item.value).length }),
        {} as Record<SuggestionStatus, number>,
      ),
    [suggestions],
  );

  return (
    <section className="admin-page">
      <div className="admin-hero glass">
        <div>
          <p className="eyebrow">RP WORLD ADMIN</p>
          <h2>Admin Panel</h2>
          <p>Review community suggestions and keep track of what is being considered for RP WORLD.</p>
        </div>
        <button className="admin-refresh-button" type="button" onClick={() => void loadSuggestions()} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? "admin-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="admin-section-tabs glass">
        <button type="button" className={activeSection === "suggestions" ? "active" : ""} onClick={() => setActiveSection("suggestions")}>Suggestions</button>
        <button type="button" className={activeSection === "support" ? "active" : ""} onClick={() => setActiveSection("support")}><Heart size={15} /> Support</button>
      </div>

      {activeSection === "suggestions" ? <>
      <div className="admin-stat-grid">
        {statuses.map((item) => (
          <button
            key={item.value}
            type="button"
            className={statusFilter === item.value ? "admin-stat active" : "admin-stat"}
            onClick={() => setStatusFilter(statusFilter === item.value ? "all" : item.value)}
          >
            <strong>{counts[item.value] ?? 0}</strong>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-filters glass">
        <div className="admin-filter-label"><Filter size={15} /> Filters</div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | SuggestionStatus)}>
          <option value="all">All statuses</option>
          {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as (typeof categories)[number])}>
          {categories.map((item) => <option key={item} value={item}>{item === "all" ? "All categories" : item}</option>)}
        </select>
      </div>

      {message && <p className="form-message success">{message}</p>}
      {error && <p className="form-message error">{error}</p>}

      <div className="admin-suggestions">
        {filteredSuggestions.length === 0 ? (
          <div className="empty-state glass">
            <Check size={24} />
            <strong>No suggestions match these filters.</strong>
            <span>New suggestions will appear here when members submit them.</span>
          </div>
        ) : (
          filteredSuggestions.map((suggestion) => {
            const submitter = profiles[suggestion.user_id];
            return (
              <article className="admin-suggestion-card glass" key={suggestion.id}>
                <div className="admin-suggestion-top">
                  <div>
                    <span className="admin-category">{suggestion.category}</span>
                    <h3>{suggestion.title}</h3>
                  </div>
                  <span className={"admin-status admin-status-" + suggestion.status}>{suggestion.status}</span>
                </div>

                <p className="admin-description">{suggestion.description}</p>

                <div className="admin-suggestion-meta">
                  <span>
                    <span className="avatar small-avatar" style={submitter?.avatar_url ? { backgroundImage: `url(${submitter.avatar_url})` } : undefined}>
                      {!submitter?.avatar_url && (submitter?.display_name?.trim().slice(0, 1).toUpperCase() || "R")}
                    </span>
                    <span>
                      <strong>{submitter?.display_name ?? "RP WORLD member"}</strong>
                      <small>@{submitter?.username ?? "member"}</small>
                    </span>
                  </span>
                  <time><Clock3 size={12} /> {formatDate(suggestion.created_at)}</time>
                </div>

                <div className="admin-suggestion-actions">
                  <select
                    value={suggestion.status}
                    onChange={(event) => void updateStatus(suggestion.id, event.target.value as SuggestionStatus)}
                    disabled={busyId === suggestion.id}
                    aria-label={`Update status for ${suggestion.title}`}
                  >
                    {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  {busyId === suggestion.id && <span>Saving…</span>}
                </div>
              </article>
            );
          })
        )}
      </div>
      </> : <>
        <div className="admin-stat-grid">
          {(["pending", "paid", "cancelled", "refunded"] as SupportStatus[]).map((status) => (
            <button key={status} type="button" className={supportStatusFilter === status ? "admin-stat active" : "admin-stat"} onClick={() => setSupportStatusFilter(supportStatusFilter === status ? "all" : status)}>
              <strong>{supportCounts[status]}</strong><span>{status}</span>
            </button>
          ))}
        </div>
        <div className="admin-support-summary glass">
          <div><span>Pending commitments</span><strong>₱{supportTotals.pending.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></div>
          <div><span>Marked paid</span><strong>₱{supportTotals.paid.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></div>
        </div>
        <div className="admin-filters glass">
          <div className="admin-filter-label"><Filter size={15} /> Support filters</div>
          <select value={supportStatusFilter} onChange={(event) => setSupportStatusFilter(event.target.value as "all" | SupportStatus)}>
            <option value="all">All statuses</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option>
          </select>
        </div>
        <div className="admin-suggestions">
          {filteredSupportIntents.length === 0 ? <div className="empty-state glass"><Heart size={24} /><strong>No support requests match this filter.</strong><span>Support commitments will appear here after members submit them.</span></div> :
            filteredSupportIntents.map((intent) => {
              const submitter = profiles[intent.user_id];
              return <article className="admin-suggestion-card glass" key={intent.id}>
                <div className="admin-suggestion-top"><div><span className="admin-category">{intent.frequency === "monthly" ? "Monthly" : "One-time"}</span><h3>₱{Number(intent.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</h3></div><span className={"admin-status admin-status-" + intent.status}>{intent.status}</span></div>
                {intent.note && <p className="admin-description">{intent.note}</p>}
                <div className="admin-suggestion-meta"><span><span className="avatar small-avatar" style={submitter?.avatar_url ? { backgroundImage: `url(${submitter.avatar_url})` } : undefined}>{!submitter?.avatar_url && (submitter?.display_name?.trim().slice(0, 1).toUpperCase() || "R")}</span><span><strong>{submitter?.display_name ?? "RP WORLD member"}</strong><small>@{submitter?.username ?? "member"}</small></span></span><time><Clock3 size={12} /> {formatDate(intent.created_at)}</time></div>
                <div className="admin-suggestion-actions"><select value={intent.status} onChange={(event) => void updateSupportStatus(intent.id, event.target.value as SupportStatus)} disabled={busyId === intent.id} aria-label="Update support status"><option value="pending">Pending</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></select>{busyId === intent.id && <span>Saving…</span>}</div>
              </article>;
            })}
        </div>
      </>}
    </section>
  );
}
