import { Camera, Heart, Home, Image, Link as LinkIcon, LogIn, LogOut, Mail, MapPin, Menu, MessageCircle, Moon, Pencil, Plus, Search, Sparkles, Sun, User, UserPlus, X } from "lucide-react";
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
  comments: number;
};
type Highlight = { id: string; user_id: string; title: string; image_url: string | null; created_at: string; };\n\ntype Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
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
  const [posts, setPosts] = useState<Post[]>([]);\n  const [profilePosts, setProfilePosts] = useState<Post[]>([]);\n  const [highlights, setHighlights] = useState<Highlight[]>([]);\n  const [highlightOpen, setHighlightOpen] = useState(false);\n  const [highlightTitle, setHighlightTitle] = useState("");\n  const [highlightImage, setHighlightImage] = useState("");\n  const [highlightBusy, setHighlightBusy] = useState(false);
  const [view, setView] = useState<"home" | "discover" | "profile" | "menu">("home");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");\n  const [avatarUrl, setAvatarUrl] = useState("");\n  const [coverUrl, setCoverUrl] = useState("");
  const [postText, setPostText] = useState("");
  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [postBusy, setPostBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [feedError, setFeedError] = useState("");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState<string | null>(null);

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
        setBio(data.bio);\n        setAvatarUrl(data.avatar_url ?? "");\n        setCoverUrl(data.cover_url ?? "");
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
      .select("id, author_id, content, media_url, created_at, post_likes(count), post_comments(count)")
      .order("created_at", { ascending: false })
      .limit(30);
    if (loadError) {
      setFeedError("The feed is unavailable right now.");
      return;
    }
    const rows = (data ?? []) as Array<Post & { post_likes?: { count: number }[]; post_comments?: { count: number }[] }>;
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
      comments: row.post_comments?.[0]?.count ?? 0,
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

  async function loadProfilePosts() {
    if (!supabase || !session?.user) return;
    const { data, error: loadError } = await supabase
      .from("posts")
      .select("id, author_id, content, media_url, created_at, post_likes(count), post_comments(count)")
      .eq("author_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (loadError) return;
    const rows = (data ?? []) as Array<Post & { post_likes?: { count: number }[]; post_comments?: { count: number }[] }>;
    const postIds = rows.map((row) => row.id);
    const { data: myLikes } = postIds.length
      ? await supabase.from("post_likes").select("post_id").eq("user_id", session.user.id).in("post_id", postIds)
      : { data: [] as { post_id: string }[] };
    const likedSet = new Set((myLikes ?? []).map((item) => item.post_id));
    setProfilePosts(rows.map((row) => ({
      id: row.id,
      author_id: row.author_id,
      content: row.content,
      media_url: row.media_url,
      created_at: row.created_at,
      profile: profile ?? undefined,
      likes: row.post_likes?.[0]?.count ?? 0,
      liked: likedSet.has(row.id),
      comments: row.post_comments?.[0]?.count ?? 0,
    })));
  }

  async function loadHighlights() {
    if (!supabase || !session?.user) return;
    const { data } = await supabase
      .from("profile_highlights")
      .select("id, user_id, title, image_url, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true });
    setHighlights((data ?? []) as Highlight[]);
  }

  async function createHighlight(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !session?.user || !highlightTitle.trim()) return;
    setHighlightBusy(true);
    const { data, error: saveError } = await supabase
      .from("profile_highlights")
      .insert({
        user_id: session.user.id,
        title: highlightTitle.trim(),
        image_url: highlightImage.trim() || null,
      })
      .select("id, user_id, title, image_url, created_at")
      .single();
    setHighlightBusy(false);
    if (saveError || !data) return;
    setHighlights((current) => [...current, data as Highlight]);
    setHighlightTitle("");
    setHighlightImage("");
    setHighlightOpen(false);
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

  async function loadComments(postId: string) {
    if (!supabase || !session?.user) return;
    const { data, error: loadError } = await supabase
      .from("post_comments")
      .select("id, post_id, author_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (loadError) return;
    const rows = (data ?? []) as Comment[];
    const authorIds = [...new Set(rows.map((row) => row.author_id))];
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("*").in("id", authorIds)
      : { data: [] as Profile[] };
    const profileMap = new Map((profiles ?? []).map((item) => [item.id, item as Profile]));
    setCommentsByPost((current) => ({
      ...current,
      [postId]: rows.map((row) => ({ ...row, profile: profileMap.get(row.author_id) })),
    }));
  }

  async function toggleComments(postId: string) {
    const next = openComments === postId ? null : postId;
    setOpenComments(next);
    if (next && !commentsByPost[postId]) await loadComments(postId);
  }

  async function createComment(event: FormEvent, postId: string) {
    event.preventDefault();
    if (!supabase || !session?.user) return;
    const content = (commentDrafts[postId] ?? "").trim();
    if (!content) return;
    setCommentBusy(postId);
    const { data, error: saveError } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, author_id: session.user.id, content })
      .select("id, post_id, author_id, content, created_at")
      .single();
    setCommentBusy(null);
    if (saveError || !data) return;

    const newComment = {
      ...(data as Comment),
      profile: profile ?? undefined,
    };
    setCommentsByPost((current) => ({
      ...current,
      [postId]: [...(current[postId] ?? []), newComment],
    }));
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    setPosts((current) => current.map((item) =>
      item.id === postId ? { ...item, comments: item.comments + 1 } : item
    ));
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
                        <button className={openComments === post.id ? "post-action active" : "post-action"} type="button" onClick={() => void toggleComments(post.id)}><MessageCircle size={17} /> {post.comments || "Reply"}</button>
                      </div>
                      {openComments === post.id && (
                        <div className="comments-panel">
                          <div className="comments-list">
                            {(commentsByPost[post.id] ?? []).length === 0 ? (
                              <span className="comments-empty">No replies yet. Start the conversation.</span>
                            ) : (
                              (commentsByPost[post.id] ?? []).map((comment) => (
                                <div className="comment-row" key={comment.id}>
                                  <span className="avatar small-avatar">{initials(comment.profile?.display_name ?? "RP")}</span>
                                  <div><strong>{comment.profile?.display_name ?? "RP WORLD member"}</strong><p>{comment.content}</p></div>
                                </div>
                              ))
                            )}
                          </div>
                          <form className="comment-form" onSubmit={(event) => void createComment(event, post.id)}>
                            <span className="avatar small-avatar">{initials(profile.display_name)}</span>
                            <input
                              value={commentDrafts[post.id] ?? ""}
                              onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                              placeholder="Write a reply…"
                              maxLength={500}
                              aria-label="Write a reply"
                            />
                            <button type="submit" disabled={commentBusy === post.id || !(commentDrafts[post.id] ?? "").trim()} aria-label="Send reply">
                              {commentBusy === post.id ? "…" : "Send"}
                            </button>
                          </form>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}

            {view === "discover" && <div className="empty-state glass"><Search size={24} /><strong>Discover is coming next.</strong><span>Communities, arenas, creators, and search will live here.</span></div>}
            {view === "profile" && (
  <section className="profile-page">
    <div className="profile-hero glass">
      <div className="profile-cover" style={profile.cover_url ? { backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.42)),url(${profile.cover_url})` } : undefined}>
        <button className="profile-edit-float" type="button" onClick={() => setProfileOpen(true)} aria-label="Edit profile"><Pencil size={15}/></button>
      </div>
      <div className="profile-main">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar avatar" style={profile.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : undefined}>
            {!profile.avatar_url && initials(profile.display_name)}
          </div>
        </div>
        <div className="profile-identity">
          <div className="profile-name-row"><div><h2>{profile.display_name}</h2><span>@{profile.username}</span></div><button className="outline-button" type="button" onClick={() => setProfileOpen(true)}><Pencil size={14}/> Edit</button></div>
          <p className="profile-bio">{profile.bio || "No bio yet. Tell the world who you are."}</p>
          <div className="profile-meta"><span><Sparkles size={13}/> {profile.rp_id}</span><span><MapPin size={13}/> RP WORLD</span></div>
        </div>
      </div>
      <div className="profile-stats">
        <div><strong>{profilePosts.length}</strong><span>Posts</span></div>
        <div><strong>{highlights.length}</strong><span>Highlights</span></div>
        <div><strong>RP</strong><span>Identity</span></div>
      </div>
    </div>

    <div className="profile-section">
      <div className="section-heading"><div><p className="eyebrow">HIGHLIGHTS</p><h3>Moments</h3></div><button className="small-add" type="button" onClick={() => setHighlightOpen(true)}><Plus size={14}/> Add</button></div>
      <div className="highlights-row">
        <button className="highlight-card add-highlight glass" type="button" onClick={() => setHighlightOpen(true)}><span><Plus size={19}/></span><strong>New</strong></button>
        {highlights.map((item) => (
          <div className="highlight-card glass" key={item.id}>
            <div className="highlight-image" style={item.image_url ? { backgroundImage: `url(${item.image_url})` } : undefined}>{!item.image_url && <Sparkles size={20}/>}</div>
            <strong>{item.title}</strong>
          </div>
        ))}
      </div>
    </div>

    <div className="profile-section profile-posts">
      <div className="section-heading"><div><p className="eyebrow">YOUR ACTIVITY</p><h3>Posts</h3></div></div>
      {profilePosts.length === 0 ? (
        <div className="empty-state glass"><Image size={22}/><strong>No posts yet.</strong><span>Your published posts will appear here.</span><button className="primary-button" type="button" onClick={() => setComposerOpen(true)}>Create a post</button></div>
      ) : (
        <div className="feed-list">{profilePosts.map((post) => (
          <article className="post-card glass" key={post.id}>
            <div className="post-head"><div className="avatar" style={profile.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : undefined}>{!profile.avatar_url && initials(profile.display_name)}</div><div><strong>{profile.display_name}</strong><span>@{profile.username} · {timeAgo(post.created_at)}</span></div></div>
            <p className="post-content">{post.content}</p>
            <div className="post-actions"><button className={post.liked ? "post-action liked" : "post-action"} type="button" onClick={() => void toggleLike(post)}><Heart size={17} fill={post.liked ? "currentColor" : "none"} />{post.likes}</button><span className="post-action"><MessageCircle size={17}/>{post.comments}</span></div>
          </article>
        ))}</div>
      )}
    </div>
  </section>
)}
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

      {highlightOpen && session && profile && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setHighlightOpen(false)}>
          <section className="auth-sheet glass" role="dialog" aria-modal="true" aria-labelledby="highlight-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header"><div><p className="eyebrow">PROFILE HIGHLIGHT</p><h2 id="highlight-title">Add a moment.</h2></div><button className="icon-button" type="button" aria-label="Close" onClick={() => setHighlightOpen(false)}><X size={18}/></button></div>
            <p className="sheet-copy">Create a highlight for your profile. You can add an image URL now; image uploads can be connected to Supabase Storage next.</p>
            <form className="auth-form" onSubmit={createHighlight}>
              <label><span>Title</span><div className="input-wrap"><input value={highlightTitle} onChange={(event) => setHighlightTitle(event.target.value)} maxLength={24} placeholder="Scenes, Events, OCs…" required /></div></label>
              <label><span>Image URL <small>optional</small></span><div className="input-wrap"><LinkIcon size={15}/><input value={highlightImage} onChange={(event) => setHighlightImage(event.target.value)} placeholder="https://…" /></div></label>
              <button className="primary-button full" type="submit" disabled={highlightBusy}>{highlightBusy ? "Saving…" : "Add highlight"}</button>
            </form>
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
              <label><span>Avatar URL <small>optional</small></span><div className="input-wrap"><Camera size={15}/><input type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://…" /></div></label>
              <label><span>Cover photo URL <small>optional</small></span><div className="input-wrap"><Image size={15}/><input type="url" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="https://…" /></div></label>
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
