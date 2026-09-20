import { Heart, Home, LogIn, LogOut, Mail, Menu, MessageCircle, Moon, Plus, Search, Sparkles, Sun, User, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { ThemePicker } from "./components/ThemePicker";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { themes, type Appearance, type ThemeId } from "./types/theme";
import type { Profile } from "./types/profile";

const THEME_KEY = "rpw-theme";
const APPEARANCE_KEY = "rpw-appearance";

type Post = {
  id: string;
  author_id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  profile?: Profile;
  likes: number;
  liked: boolean;
};

function readTheme(): ThemeId {
  const saved = localStorage.getItem(THEME_KEY);
  return themes.some((theme) => theme.id === saved) ? (saved as ThemeId) : "midnight";
}
function readAppearance(): Appearance {
  const saved = localStorage.getItem(APPEARANCE_KEY);
  return saved === "light" || saved === "system" ? saved : "dark";
}
function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "R";
}
function timeAgo(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function App() {
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  const [appearance, setAppearance] = useState<Appearance>(readAppearance);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [view, setView] = useState<"home" | "discover" | "profile" | "menu">("home");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [postText, setPostText] = useState("");
  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [postBusy, setPostBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [feedError, setFeedError] = useState("");

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
      setProfileError("");
      const { data, error: loadError } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      if (!active) return;
      if (loadError) {
        setProfileError("Your profile could not be loaded. Please check the database migration.");
        return;
      }
      setProfile(data as Profile | null);
      if (!data) {
        setUsername("");
        setDisplayName("");
        setBio("");
        setProfileOpen(true);
      } else {
        setUsername(data.username);
        setDisplayName(data.display_name);
        setBio(data.bio);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (session?.user && profile) void loadFeed();
    else setPosts([]);
  }, [session, profile]);

  async function loadFeed() {
    if (!supabase || !session?.user) return;
    setFeedError("");
    const { data, error: loadError } = await supabase
      .from("posts")
      .select("id, author_id, content, media_url, created_at, post_likes(count)")
      .order("created_at", { ascending: false })
      .limit(30);
    if (loadError) {
      setFeedError("The feed is unavailable right now.");
      return;
    }
    const rows = (data ?? []) as Array<Post & { post_likes?: { count: number }[] }>;
    const authorIds = [...new Set(rows.map((row) => row.author_id))];
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("*").in("id", authorIds)
      : { data: [] as Profile[] };
    const profileMap = new Map((profiles ?? []).map((item) => [item.id, item as Profile]));
    const postIds = rows.map((row) => row.id);
    const { data: myLikes } = postIds.length
      ? await supabase.from("post_likes").select("post_id").eq("user_id", session.user.id).in("post_id", postIds)
      : { data: [] as { post_id: string }[] };
    const likedSet = new Set((myLikes ?? []).map((item) => item.post_id));
    if (session.user.id && rows.length === 0) {
      // Empty feeds are a valid first-run state.
    }
    setPosts(rows.map((row) => ({
      id: row.id,
      author_id: row.author_id,
      content: row.content,
      media_url: row.media_url,
      created_at: row.created_at,
      profile: profileMap.get(row.author_id),
      likes: row.post_likes?.[0]?.count ?? 0,
      liked: likedSet.has(row.id),
    })));
  }

  const isDark = appearance !== "light";
  const title = useMemo(() => {
    if (view === "discover") return "Discover";
    if (view === "profile") return "Your profile";
    if (view === "menu") return "RP WORLD";
    return profile ? `Welcome, ${profile.display_name}.` : "Your RP world.";
  }, [profile, view]);

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
      setProfileError("Username must be 3–24 characters using lowercase letters, numbers, and underscores.");
      setProfileBusy(false);
      return;
    }
    if (!cleanDisplayName || cleanDisplayName.length > 60) {
      setProfileError("Display name must be between 1 and 60 characters.");
      setProfileBusy(false);
      return;
    }
    const profilePayload = {
      id: session.user.id,
      username: cleanUsername,
      display_name: cleanDisplayName,
      bio: cleanBio,
      theme_id: theme,
    };

    const result = profile
      ? await supabase.from("profiles").update(profilePayload).eq("id", session.user.id).select("*").single()
      : await supabase.from("profiles").insert(profilePayload).select("*").single();

    setProfileBusy(false);
    if (result.error) {
      if (result.error.code === "23505") {
        setProfileError("That username is already taken.");
      } else {
        console.error("RP WORLD profile save failed", result.error);
        setProfileError(
          result.error.message
            ? `We could not save your profile: ${result.error.message}`
            : "We could not save your profile. Please try again.",
        );
      }
      return;
    }
    setProfile(result.data as Profile);
    setProfileOpen(false);
  }

  async function createPost(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !session?.user || !postText.trim()) return;
    setPostBusy(true);
    setFeedError("");
    const { error: saveError } = await supabase.from("posts").insert({
      author_id: session.user.id,
      content: postText.trim(),
    });
    setPostBusy(false);
    if (saveError) {
      setFeedError("We could not publish that post.");
      return;
    }
    setPostText("");
    setComposerOpen(false);
    await loadFeed();
  }

  async function toggleLike(post: Post) {
    if (!supabase || !session?.user) return;
    setPosts((current) => current.map((item) => item.id === post.id
      ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) }
      : item));
    const result = post.liked
      ? await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", session.user.id)
      : await supabase.from("post_likes").insert({ post_id: post.id, user_id: session.user.id });
    if (result.error) {
      setPosts((current) => current.map((item) => item.id === post.id
        ? { ...item, liked: post.liked, likes: post.likes }
        : item));
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setPosts([]);
    setView("home");
    setProfileOpen(false);
  }

  return (
    <div className={isDark ? "app dark" : "app light"}>
      <header className="topbar glass">
        <button className="brand-button" type="button" onClick={() => setView("home")} aria-label="RP WORLD home">
          <span className="brand-mark"><Sparkles size={16} /></span>
          <span><small>ROLE PLAY WORLD</small><strong>RP WORLD</strong></span>
        </button>
        <div className="header-actions">
          <ThemePicker theme={theme} onThemeChange={setTheme} />
          <button className="theme-toggle" type="button" aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setAppearance(isDark ? "light" : "dark")}>
            <span className={isDark ? "toggle-thumb dark-thumb" : "toggle-thumb"}>{isDark ? <Moon size={15} /> : <Sun size={15} />}</span>
          </button>
          {session
            ? <button className="auth-icon-button glass" type="button" aria-label="Sign out" onClick={handleLogout}><LogOut size={17} /></button>
            : <button className="auth-icon-button glass" type="button" aria-label="Open account" onClick={() => { setAuthMode("login"); setAuthOpen(true); resetAuthMessages(); }}><LogIn size={17} /></button>}
        </div>
      </header>

      {!session || !profile ? (
        <main className="hero">
          <div className="hero-icon glass"><Sparkles size={28} /></div>
          <p className="eyebrow">{session ? "ACCESS GRANTED" : "RP WORLD"}</p>
          <h2>{session ? "Build your RP identity." : "Your RP world. Your identity. Your aesthetic."}</h2>
          <p className="hero-copy">{session ? "One account, one RP identity, and a profile that belongs to you." : "A social world for role players, communities, stories, creators, and entertainment."}</p>
          {session
            ? <button className="primary-button" type="button" onClick={() => setProfileOpen(true)}><UserPlus size={17} /> Set up profile</button>
            : <button className="primary-button" type="button" onClick={() => { setAuthMode("signup"); setAuthOpen(true); resetAuthMessages(); }}><UserPlus size={17} /> Create your account</button>}
          <div className="status glass"><span className="status-dot" />{supabaseConfigured ? (session ? "Secure session · profile setup" : "Secure foundation") : "Supabase setup required"}</div>
          {profileError && <p className="form-message error standalone-error">{profileError}</p>}
        </main>
      ) : (
        <main className="social-shell">
          <section className="feed-column">
            <div className="page-heading">
              <div><p className="eyebrow">RP WORLD FEED</p><h2>{title}</h2></div>
              <button className="glass circle-button" type="button" aria-label="Search" onClick={() => setView("discover")}><Search size={17} /></button>
            </div>

            {view === "home" && (
              <>
                <button className="composer glass" type="button" onClick={() => setComposerOpen(true)}>
                  <span className="avatar">{initials(profile.display_name)}</span>
                  <span>Share something with the world…</span>
                  <Plus size={18} />
                </button>
                {feedError && <p className="form-message error standalone-error">{feedError}</p>}
                <div className="feed-list">
                  {posts.length === 0 ? (
                    <div className="empty-state glass"><Sparkles size={22} /><strong>Your world is quiet.</strong><span>Be the first to drop a post and start the feed.</span><button className="primary-button" type="button" onClick={() => setComposerOpen(true)}>Create the first post</button></div>
                  ) : posts.map((post) => (
                    <article className="post-card glass" key={post.id}>
                      <div className="post-head">
                        <span className="avatar">{initials(post.profile?.display_name ?? "RP")}</span>
                        <div><strong>{post.profile?.display_name ?? "RP WORLD member"}</strong><span>@{post.profile?.username ?? "member"} · {timeAgo(post.created_at)}</span></div>
                      </div>
                      <p className="post-content">{post.content}</p>
                      <div className="post-actions">
                        <button className={post.liked ? "post-action liked" : "post-action"} type="button" onClick={() => void toggleLike(post)}><Heart size={17} fill={post.liked ? "currentColor" : "none"} />{post.likes}</button>
                        <button className="post-action" type="button"><MessageCircle size={17} /> Reply</button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

            {view === "discover" && <div className="empty-state glass"><Search size={24} /><strong>Discover is coming next.</strong><span>Communities, arenas, creators, and search will live here.</span></div>}
            {view === "profile" && <section className="profile-card glass"><div className="profile-cover" /><div className="profile-avatar avatar">{initials(profile.display_name)}</div><h2>{profile.display_name}</h2><span>@{profile.username}</span><p>{profile.bio || "No bio yet."}</p><button className="primary-button" type="button" onClick={() => setProfileOpen(true)}>Edit profile</button></section>}
            {view === "menu" && <div className="menu-card glass"><button type="button" onClick={() => setProfileOpen(true)}><User size={18}/> Edit profile</button><button type="button" onClick={() => setView("discover")}><Search size={18}/> Discover</button><button type="button" onClick={() => void handleLogout()}><LogOut size={18}/> Sign out</button></div>}
          </section>
        </main>
      )}

      {session && profile && (
        <nav className="bottom-nav glass" aria-label="Primary navigation">
          <button className={view === "home" ? "nav-item active" : "nav-item"} type="button" onClick={() => setView("home")}><Home size={19}/><span>Home</span></button>
          <button className={view === "discover" ? "nav-item active" : "nav-item"} type="button" onClick={() => setView("discover")}><Search size={19}/><span>Discover</span></button>
          <button className="nav-create" type="button" aria-label="Create post" onClick={() => setComposerOpen(true)}><Plus size={22}/></button>
          <button className={view === "profile" ? "nav-item active" : "nav-item"} type="button" onClick={() => setView("profile")}><User size={19}/><span>Profile</span></button>
          <button className={view === "menu" ? "nav-item active" : "nav-item"} type="button" onClick={() => setView("menu")}><Menu size={19}/><span>Menu</span></button>
        </nav>
      )}

      {composerOpen && session && profile && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setComposerOpen(false)}>
          <section className="auth-sheet glass" role="dialog" aria-modal="true" aria-labelledby="composer-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header"><div><p className="eyebrow">CREATE</p><h2 id="composer-title">Drop a post.</h2></div><button className="icon-button" type="button" aria-label="Close" onClick={() => setComposerOpen(false)}><X size={18}/></button></div>
            <p className="sheet-copy">Share a thought, scene, update, character moment, or anything your RP world wants to say.</p>
            <form className="auth-form" onSubmit={createPost}>
              <div className="input-wrap textarea-wrap"><textarea value={postText} onChange={(event) => setPostText(event.target.value)} placeholder="What's happening in your world?" maxLength={2000} rows={7} autoFocus required /></div>
              <div className="composer-footer"><span>{postText.length}/2000</span><button className="primary-button" type="submit" disabled={postBusy || !postText.trim()}>{postBusy ? "Publishing…" : "Publish post"}</button></div>
            </form>
          </section>
        </div>
      )}

      {authOpen && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setAuthOpen(false)}>
          <section className="auth-sheet glass" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header"><div><p className="eyebrow">RP WORLD ACCESS</p><h2 id="auth-title">{authMode === "login" ? "Welcome back." : "Create your identity."}</h2></div><button className="icon-button" type="button" aria-label="Close" onClick={() => setAuthOpen(false)}><X size={18}/></button></div>
            <p className="sheet-copy">{authMode === "login" ? "Sign in to continue to RP WORLD." : "Start with your email and a secure password. Your email stays private."}</p>
            {!supabaseConfigured ? <div className="setup-notice"><strong>Supabase is not connected yet.</strong><span>Add the browser-safe Supabase environment variables.</span></div> : (
              <form className="auth-form" onSubmit={handleAuth}>
                <label><span>Email</span><div className="input-wrap"><Mail size={16}/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required/></div></label>
                <label><span>Password</span><div className="input-wrap"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={6} required/></div></label>
                {error && <p className="form-message error">{error}</p>}{message && <p className="form-message success">{message}</p>}
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
            <div className="sheet-header"><div><p className="eyebrow">RP WORLD IDENTITY</p><h2 id="profile-title">Build your profile.</h2></div>{profile && <button className="icon-button" type="button" aria-label="Close" onClick={() => setProfileOpen(false)}><X size={18}/></button>}</div>
            <p className="sheet-copy">Choose the identity people will see inside RP WORLD. Your email stays private and is not your public username.</p>
            <form className="auth-form" onSubmit={handleProfileSubmit}>
              <label><span>Username</span><div className="input-wrap"><span className="input-prefix">@</span><input type="text" value={username} onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())} placeholder="yourname" maxLength={24} required/></div></label>
              <label><span>Display name</span><div className="input-wrap"><input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your RP name" maxLength={60} required/></div></label>
              <label><span>Bio <small>optional</small></span><div className="input-wrap textarea-wrap"><textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="A short line about your RP identity." maxLength={160} rows={3}/></div></label>
              {profileError && <p className="form-message error">{profileError}</p>}
              <button className="primary-button full" type="submit" disabled={profileBusy}>{profileBusy ? "Saving…" : profile ? "Save changes" : "Continue"}</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
