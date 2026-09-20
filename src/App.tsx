import {
  ArrowLeft,
  Camera,
  Clock,
  Eye,
  EyeOff,
  Heart,
  Home,
  Image,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Share2,
  Repeat2,
  Bookmark,
  MoreVertical,
  Pin,
  Tag,
  Archive,
  Trash2,
  Link2,
  Moon,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Sun,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { ThemePicker } from "./components/ThemePicker";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { themes, type Appearance, type ThemeId } from "./types/theme";
import type { Profile } from "./types/profile";

const THEME_KEY = "rpw-theme";
const APPEARANCE_KEY = "rpw-appearance";
const VIEW_KEY = "rpw-current-view";
const PUBLIC_PROFILE_KEY = "rpw-current-public-profile";

type AppView = "home" | "discover" | "profile" | "public" | "menu";

function readStoredView(): AppView {
  try {
    const saved = sessionStorage.getItem(VIEW_KEY);
    return saved === "home" || saved === "discover" || saved === "profile" || saved === "public" || saved === "menu"
      ? saved
      : "home";
  } catch {
    return "home";
  }
}

type Post = {
  id: string;
  author_id: string;
  content: string;
  media_url: string | null;
  media_type?: string | null;
  created_at: string;
  profile?: Profile;
  likes: number;
  liked: boolean;
  liked_at: string | null;
  comments: number;
  reposts: number;
  shares: number;
  reposted: boolean;
  reposted_at?: string | null;
  pinned_at?: string | null;
  archived_at?: string | null;
  trashed_at?: string | null;
  tagged_profiles?: Profile[];
  shared_post_id?: string | null;
  share_caption?: string | null;
  shared_original?: {
    content: string;
    media_url: string | null;
    media_type?: string | null;
    created_at: string;
    profile?: Profile;
  } | null;
};

type HighlightStyle = "circle" | "portrait";

type Highlight = {
  id: string;
  user_id: string;
  title: string;
  image_url: string | null;
  created_at: string;
};

type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  profile?: Profile;
  reactionCount: number;
  reactionType: string | null;
};

function readTheme(): ThemeId {
  const saved = localStorage.getItem(THEME_KEY);
  return themes.some((theme) => theme.id === saved)
    ? (saved as ThemeId)
    : "midnight";
}

function readAppearance(): Appearance {
  const saved = localStorage.getItem(APPEARANCE_KEY);
  return saved === "light" || saved === "system" ? saved : "dark";
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "R";
}

function timeAgo(value: string) {
  const seconds = Math.max(
    1,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );

  if (seconds < 60) return "now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function exactTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function App() {
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  const [appearance, setAppearance] =
    useState<Appearance>(readAppearance);

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [profileReposts, setProfileReposts] = useState<Post[]>([]);
  const [profileSection, setProfileSection] = useState<"posts" | "reposts">("posts");
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [highlightTitle, setHighlightTitle] = useState("");
  const [highlightImage, setHighlightImage] = useState("");
  const [highlightFile, setHighlightFile] = useState<File | null>(null);
  const [highlightBusy, setHighlightBusy] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [activePostMedia, setActivePostMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [highlightStyle, setHighlightStyle] = useState<HighlightStyle>("circle");

  const [view, setView] = useState<AppView>(readStoredView);

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] =
    useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [postText, setPostText] = useState("");
  const [postMediaFile, setPostMediaFile] = useState<File | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [editPostMediaFile, setEditPostMediaFile] = useState<File | null>(null);
  const [editPostMediaRemove, setEditPostMediaRemove] = useState(false);
  const [editPostOpen, setEditPostOpen] = useState(false);
  const [editPostTarget, setEditPostTarget] = useState<Post | null>(null);
  const [editPostText, setEditPostText] = useState("");
  const [editPostBusy, setEditPostBusy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [postBusy, setPostBusy] = useState(false);
  const [repostBusy, setRepostBusy] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<Post | null>(null);
  const [shareCaption, setShareCaption] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [postActionTarget, setPostActionTarget] = useState<Post | null>(null);
  const [tagPostTarget, setTagPostTarget] = useState<Post | null>(null);
  const [tagProfiles, setTagProfiles] = useState<Profile[]>([]);
  const [taggedUserIds, setTaggedUserIds] = useState<Set<string>>(new Set());
  const [tagSearch, setTagSearch] = useState("");
  const [tagBusy, setTagBusy] = useState(false);
  const [postActionBusy, setPostActionBusy] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [feedError, setFeedError] = useState("");

  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, Comment[]>
  >({});
  const [commentDrafts, setCommentDrafts] = useState<
    Record<string, string>
  >({});
  const [commentBusy, setCommentBusy] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ postId: string; commentId: string } | null>(null);
  const [commentReactionBusy, setCommentReactionBusy] = useState<string | null>(null);
  const [openReactionPicker, setOpenReactionPicker] = useState<string | null>(null);
  const [openTimestamp, setOpenTimestamp] = useState<string | null>(null);
  const [viewAs, setViewAs] = useState(false);
  const [publicProfile, setPublicProfile] = useState<Profile | null>(null);
  const [publicProfilePosts, setPublicProfilePosts] = useState<Post[]>([]);
  const [publicHighlights, setPublicHighlights] = useState<Highlight[]>([]);
  const [followingPublicProfile, setFollowingPublicProfile] = useState(false);
  const [followedByPublicProfile, setFollowedByPublicProfile] = useState(false);
  const [publicProfileFriend, setPublicProfileFriend] = useState(false);
  const [discoverProfiles, setDiscoverProfiles] = useState<Profile[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Array<{ id: string; sender_id: string; content: string; created_at: string }>>>({});
  const [messageDraft, setMessageDraft] = useState("");
  const [messageNoticeOpen, setMessageNoticeOpen] = useState(false);
  const [profileStats, setProfileStats] = useState({ followers: 0, likes: 0 });

  const commentReactionOptions = [
    { type: "like", emoji: "👍", label: "Like" },
    { type: "love", emoji: "❤️", label: "Love" },
    { type: "haha", emoji: "😂", label: "Haha" },
    { type: "wow", emoji: "😮", label: "Wow" },
    { type: "sad", emoji: "😢", label: "Sad" },
    { type: "angry", emoji: "😡", label: "Angry" },
    { type: "care", emoji: "🥰", label: "Care" },
    { type: "fire", emoji: "🔥", label: "Fire" },
    { type: "laugh", emoji: "🤣", label: "Laugh" },
    { type: "celebrate", emoji: "🎉", label: "Celebrate" },
  ];

  function reactionEmoji(type: string | null) {
    return commentReactionOptions.find((reaction) => reaction.type === type)?.emoji ?? "👍";
  }

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(APPEARANCE_KEY, appearance);
    document.documentElement.dataset.appearance = appearance;
  }, [appearance]);

  // Preserve the current SPA page across a browser/app refresh. This uses
  // sessionStorage intentionally: a refresh restores the page, while a new
  // browsing session starts cleanly at Home.
  useEffect(() => {
    try {
      sessionStorage.setItem(VIEW_KEY, view);
      if (view !== "public") sessionStorage.removeItem(PUBLIC_PROFILE_KEY);
    } catch {
      // Storage can be unavailable in privacy-restricted environments.
    }
  }, [view]);

  // Public profiles need their target id restored before their data can be fetched.
  useEffect(() => {
    if (view !== "public" || publicProfile || !session?.user || !supabase) return;

    try {
      const userId = sessionStorage.getItem(PUBLIC_PROFILE_KEY);
      if (userId) void loadPublicProfile(userId);
    } catch {
      // Ignore unavailable session storage; normal navigation still works.
    }
  }, [view, publicProfile, session]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => setSession(nextSession),
    );

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

      const { data, error: loadError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!active) return;

      if (loadError) {
        setProfileError(
          "Your profile could not be loaded. Please check the database migration.",
        );
        return;
      }

      setProfile(data as Profile | null);

      if (!data) {
        setUsername("");
        setDisplayName("");
        setBio("");
        setAvatarUrl("");
        setCoverUrl("");
        setHighlightStyle("circle");
        setProfileOpen(true);
      } else {
        setUsername(data.username);
        setDisplayName(data.display_name);
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatar_url ?? "");
        setCoverUrl(data.cover_url ?? "");
        setHighlightStyle(data.highlight_style === "portrait" ? "portrait" : "circle");
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (session?.user && profile) {
      void loadFeed();
    } else {
      setPosts([]);
    }
  }, [session, profile]);

  useEffect(() => {
    if (!tagPostTarget || !session?.user || !supabase) {
      setTagProfiles([]);
      return;
    }

    let active = true;
    void supabase
      .from("profiles")
      .select("*")
      .neq("id", session.user.id)
      .limit(100)
      .then(({ data }) => {
        if (active) setTagProfiles((data ?? []) as Profile[]);
      });

    return () => {
      active = false;
    };
  }, [tagPostTarget, session]);

  useEffect(() => {
    if (view === "discover" && session?.user && profile) {
      void loadDiscoverProfiles();
    }
  }, [view, session, profile]);

  useEffect(() => {
    if (view === "profile" && session?.user && profile) {
      void loadProfilePosts();
      void loadProfileReposts();
      void loadHighlights();
    }
  }, [view, session, profile]);

  useEffect(() => {
    if (session?.user && profile) {
      void loadProfileStats(session.user.id);
    }
  }, [session, profile]);

  async function loadPostTags(postIds: string[]) {
    if (!supabase || !postIds.length) return new Map<string, Profile[]>();

    const { data: tagRows, error: tagError } = await supabase
      .from("post_tags")
      .select("post_id, user_id")
      .in("post_id", postIds);

    if (tagError || !tagRows?.length) return new Map<string, Profile[]>();

    const userIds = [...new Set(tagRows.map((row) => row.user_id))];
    const { data: taggedProfiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    const profileMap = new Map(
      (taggedProfiles ?? []).map((item) => [item.id, item as Profile]),
    );
    const map = new Map<string, Profile[]>();

    tagRows.forEach((row) => {
      const tagged = profileMap.get(row.user_id);
      if (!tagged) return;
      map.set(row.post_id, [...(map.get(row.post_id) ?? []), tagged]);
    });

    return map;
  }

  async function cleanupExpiredTrash() {
    if (!supabase || !session?.user) return;

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: expired } = await supabase
      .from("posts")
      .select("id, media_url")
      .eq("author_id", session.user.id)
      .not("trashed_at", "is", null)
      .lt("trashed_at", cutoff);

    if (!expired?.length) return;

    const mediaPaths = expired
      .map((post) => post.media_url)
      .filter((url): url is string => Boolean(url))
      .map((url) => {
        const marker = "/storage/v1/object/public/post-media/";
        const index = url.indexOf(marker);
        return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
      })
      .filter((path): path is string => Boolean(path));

    if (mediaPaths.length) {
      await supabase.storage.from("post-media").remove(mediaPaths);
    }

    await supabase
      .from("posts")
      .delete()
      .eq("author_id", session.user.id)
      .not("trashed_at", "is", null)
      .lt("trashed_at", cutoff);
  }

  async function loadFeed() {
    if (!supabase || !session?.user) return;

    setFeedError("");

    const { data, error: loadError } = await supabase
      .from("posts")
      .select(
        "id, author_id, content, media_url, media_type, created_at, pinned_at, archived_at, trashed_at, shared_post_id, share_caption, post_likes(count), post_comments(count)",
      )
      .is("archived_at", null)
      .is("trashed_at", null)
      .order("created_at", { ascending: false })
      .limit(30);

    if (loadError) {
      setFeedError("The feed is unavailable right now.");
      return;
    }

    const rows = (data ?? []) as Array<
      Post & {
        post_likes?: { count: number }[];
        post_comments?: { count: number }[];
      }
    >;

    const authorIds = [...new Set(rows.map((row) => row.author_id))];
    const sharedPostIds = [...new Set(rows.map((row) => row.shared_post_id).filter(Boolean))] as string[];

    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("*").in("id", authorIds)
      : { data: [] as Profile[] };

    const { data: sharedRows } = sharedPostIds.length
      ? await supabase
          .from("posts")
          .select("id, content, media_url, media_type, created_at, author_id")
          .in("id", sharedPostIds)
      : { data: [] as Array<{ id: string; content: string; media_url: string | null; media_type?: string | null; created_at: string; author_id: string }> };

    const sharedAuthorIds = [...new Set((sharedRows ?? []).map((row) => row.author_id))];
    const { data: sharedProfiles } = sharedAuthorIds.length
      ? await supabase.from("profiles").select("*").in("id", sharedAuthorIds)
      : { data: [] as Profile[] };

    const sharedProfileMap = new Map(
      (sharedProfiles ?? []).map((item) => [item.id, item as Profile]),
    );
    const sharedMap = new Map(
      (sharedRows ?? []).map((row) => [
        row.id,
        {
          content: row.content,
          media_url: row.media_url,
          media_type: row.media_type ?? null,
          created_at: row.created_at,
          profile: sharedProfileMap.get(row.author_id),
        },
      ]),
    );

    const profileMap = new Map(
      (profiles ?? []).map((item) => [item.id, item as Profile]),
    );

    const postIds = rows.map((row) => row.id);
    const tagMap = await loadPostTags(postIds);

    const { data: shareRows } = postIds.length
      ? await supabase
          .from("posts")
          .select("shared_post_id")
          .in("shared_post_id", postIds)
      : { data: [] as { shared_post_id: string | null }[] };

    const shareCounts = new Map<string, number>();
    (shareRows ?? []).forEach((row) => {
      if (row.shared_post_id) {
        shareCounts.set(row.shared_post_id, (shareCounts.get(row.shared_post_id) ?? 0) + 1);
      }
    });

    const { data: myLikes } = postIds.length
      ? await supabase
          .from("post_likes")
          .select("post_id, created_at")
          .eq("user_id", session.user.id)
          .in("post_id", postIds)
      : { data: [] as { post_id: string; created_at: string }[] };

    const likedSet = new Set(
      (myLikes ?? []).map((item) => item.post_id),
    );
    const likedAtMap = new Map(
      (myLikes ?? []).map((item) => [item.post_id, item.created_at]),
    );

    setPosts(
      rows.map((row) => ({
        id: row.id,
        author_id: row.author_id,
        content: row.content,
        media_url: row.media_url,
        media_type: row.media_type ?? null,
        created_at: row.created_at,
        profile: profileMap.get(row.author_id),
        likes: row.post_likes?.[0]?.count ?? 0,
        liked: likedSet.has(row.id),
        liked_at: likedAtMap.get(row.id) ?? null,
        comments: row.post_comments?.[0]?.count ?? 0,
        reposts: 0,
        reposted: false,
        shares: shareCounts.get(row.id) ?? 0,
        pinned_at: row.pinned_at ?? null,
        archived_at: row.archived_at ?? null,
        trashed_at: row.trashed_at ?? null,
        tagged_profiles: tagMap.get(row.id) ?? [],
        shared_post_id: row.shared_post_id ?? null,
        share_caption: row.share_caption ?? null,
        shared_original: row.shared_post_id ? sharedMap.get(row.shared_post_id) ?? null : null,
      })),
    );
  }

  useEffect(() => {
    if (session?.user && profile) {
      void cleanupExpiredTrash();
    }
  }, [session, profile]);

  const isDark = appearance !== "light";

  const title = useMemo(() => {
    if (view === "discover") return "Discover";
    if (view === "profile") return "Your profile";
    if (view === "public") return publicProfile?.display_name ?? "Profile";
    if (view === "menu") return "RP WORLD";

    return profile
      ? `Welcome, ${profile.display_name}.`
      : "Your RP world.";
  }, [profile, publicProfile, view]);


  const POST_PREVIEW_LENGTH = 280;

  function renderExpandablePostContent(content: string, key: string) {
    const isLong = content.length > POST_PREVIEW_LENGTH;
    const expanded = expandedPosts[key] ?? false;
    const visibleContent = isLong && !expanded
      ? content.slice(0, POST_PREVIEW_LENGTH).trimEnd()
      : content;

    return (
      <div className="post-content-wrap">
        <p className="post-content">
          {visibleContent}
          {isLong && !expanded ? "…" : ""}
        </p>
        {isLong && (
          <button
            className="post-see-more"
            type="button"
            onClick={() => setExpandedPosts((current) => ({ ...current, [key]: !expanded }))}
            aria-expanded={expanded}
          >
            {expanded ? "See less" : "See more"}
          </button>
        )}
      </div>
    );
  }

  function renderPostMedia(mediaUrl: string | null | undefined, mediaType?: string | null) {
    if (!mediaUrl) return null;
    const isVideo = mediaType?.startsWith("video/") ?? false;
    return (
      <button
        className="post-media-button"
        type="button"
        onClick={() => setActivePostMedia({ url: mediaUrl, type: isVideo ? "video" : "image" })}
        aria-label={isVideo ? "Open video" : "Open image"}
      >
        {isVideo ? (
          <video
            className="post-media post-video"
            src={mediaUrl}
            controls
            playsInline
            preload="metadata"
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          <img className="post-media" src={mediaUrl} alt="" loading="lazy" />
        )}
      </button>
    );
  }

  function validatePostMedia(file: File) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return "Please choose an image or video file.";
    }
    const maxBytes = file.type.startsWith("video/")
      ? 50 * 1024 * 1024
      : 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return file.type.startsWith("video/")
        ? "Videos must be 50 MB or smaller."
        : "Images must be 10 MB or smaller.";
    }
    return null;
  }

  async function uploadPostMedia(file: File) {
    if (!supabase || !session?.user) {
      throw new Error("You must be signed in to upload media.");
    }
    const extension =
      file.name.split(".").pop()?.toLowerCase() ||
      (file.type.startsWith("video/") ? "mp4" : "jpg");
    const filePath = `${session.user.id}/post-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("post-media")
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;
    return supabase.storage
      .from("post-media")
      .getPublicUrl(filePath).data.publicUrl;
  }

  function resetAuthMessages() {
    setError("");
    setMessage("");
  }

  function openMenu() {
    // Always leave public-profile mode before opening Menu. This prevents
    // stale viewAs state from hiding the Menu on the first navigation tap.
    setViewAs(false);
    setPublicProfile(null);
    setPublicProfilePosts([]);
    setPublicHighlights([]);
    setView("menu");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleAuth(event: FormEvent) {
    event.preventDefault();

    if (!supabase) return;

    setBusy(true);
    resetAuthMessages();

    const normalizedEmail = email.trim().toLowerCase();

    const result =
      authMode === "login"
        ? await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })
        : await supabase.auth.signUp({
            email: normalizedEmail,
            password,
          });

    setBusy(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (authMode === "signup" && !result.data.session) {
      setMessage(
        "Account created. Check your email to confirm your account.",
      );
    } else {
      setMessage(
        authMode === "login"
          ? "Welcome back."
          : "Account created successfully.",
      );

      setAuthOpen(false);
      setPassword("");
    }
  }

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();

    if (!supabase || !session?.user) return;

    const client = supabase;
    const user = session.user;

    setProfileBusy(true);
    setProfileError("");

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();
    const cleanBio = bio.trim();
    const cleanAvatarUrl = avatarUrl.trim();
    const cleanCoverUrl = coverUrl.trim();

    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      setProfileError(
        "Username must be 3–24 characters using lowercase letters, numbers, and underscores.",
      );
      setProfileBusy(false);
      return;
    }

    if (!cleanDisplayName || cleanDisplayName.length > 60) {
      setProfileError(
        "Display name must be between 1 and 60 characters.",
      );
      setProfileBusy(false);
      return;
    }

    async function uploadProfileImage(file: File, folder: "avatar" | "cover") {
      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/${folder}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await client.storage
        .from("profile-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      return client.storage
        .from("profile-media")
        .getPublicUrl(filePath).data.publicUrl;
    }

    let uploadedAvatarUrl = cleanAvatarUrl || null;
    let uploadedCoverUrl = cleanCoverUrl || null;

    try {
      if (avatarFile) {
        uploadedAvatarUrl = await uploadProfileImage(
          avatarFile,
          "avatar",
        );
      }

      if (coverFile) {
        uploadedCoverUrl = await uploadProfileImage(
          coverFile,
          "cover",
        );
      }
    } catch (uploadError) {
      setProfileBusy(false);
      setProfileError(
        `Image upload failed: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
      );
      return;
    }

    const profilePayload = {
      id: user.id,
      username: cleanUsername,
      display_name: cleanDisplayName,
      bio: cleanBio,
      avatar_url: uploadedAvatarUrl,
      cover_url: uploadedCoverUrl,
      theme_id: theme,
      highlight_style: highlightStyle,
    };

    const result = profile
      ? await supabase
          .from("profiles")
          .update(profilePayload)
          .eq("id", user.id)
          .select("*")
          .single()
      : await supabase
          .from("profiles")
          .insert(profilePayload)
          .select("*")
          .single();

    setProfileBusy(false);

    if (result.error) {
      if (result.error.code === "23505") {
        setProfileError("That username is already taken.");
      } else {
        console.error(
          "RP WORLD profile save failed",
          result.error,
        );

        setProfileError(
          result.error.message
            ? `We could not save your profile: ${result.error.message}`
            : "We could not save your profile. Please try again.",
        );
      }

      return;
    }

    setProfile(result.data as Profile);
    setAvatarFile(null);
    setCoverFile(null);
    setProfileOpen(false);
  }

  async function loadProfileStats(userId: string) {
    if (!supabase) return;

    const { count: followerCount } = await supabase
      .from("user_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", userId);

    const { data: userPosts } = await supabase
      .from("posts")
      .select("id, post_likes(count)")
      .eq("author_id", userId);

    const totalLikes = (userPosts ?? []).reduce((sum, post) => {
      const likes = (post as { post_likes?: { count: number }[] }).post_likes?.[0]?.count ?? 0;
      return sum + likes;
    }, 0);

    setProfileStats({
      followers: followerCount ?? 0,
      likes: totalLikes,
    });
  }

  async function loadProfilePosts() {
    if (!supabase || !session?.user) return;

    const { data, error: loadError } = await supabase
      .from("posts")
      .select(
        "id, author_id, content, media_url, media_type, created_at, pinned_at, archived_at, trashed_at, post_likes(count), post_comments(count)",
      )
      .eq("author_id", session.user.id)
      .is("archived_at", null)
      .is("trashed_at", null)
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (loadError) return;

    const rows = (data ?? []) as Array<
      Post & {
        post_likes?: { count: number }[];
        post_comments?: { count: number }[];
      }
    >;

    const postIds = rows.map((row) => row.id);
    const tagMap = await loadPostTags(postIds);

    const { data: myLikes } = postIds.length
      ? await supabase
          .from("post_likes")
          .select("post_id, created_at")
          .eq("user_id", session.user.id)
          .in("post_id", postIds)
      : { data: [] as { post_id: string; created_at: string }[] };

    const likedSet = new Set(
      (myLikes ?? []).map((item) => item.post_id),
    );
    const likedAtMap = new Map(
      (myLikes ?? []).map((item) => [item.post_id, item.created_at]),
    );

    setProfilePosts(
      rows.map((row) => ({
        id: row.id,
        author_id: row.author_id,
        content: row.content,
        media_url: row.media_url,
        media_type: row.media_type ?? null,
        created_at: row.created_at,
        profile: profile ?? undefined,
        likes: row.post_likes?.[0]?.count ?? 0,
        liked: likedSet.has(row.id),
        liked_at: likedAtMap.get(row.id) ?? null,
        comments: row.post_comments?.[0]?.count ?? 0,
        reposts: 0,
        shares: 0,
        pinned_at: row.pinned_at ?? null,
        archived_at: row.archived_at ?? null,
        trashed_at: row.trashed_at ?? null,
        tagged_profiles: tagMap.get(row.id) ?? [],
        reposted: false,
      })),
    );
  }

  async function loadProfileReposts() {
    if (!supabase || !session?.user) return;

    const { data: repostRows, error: repostError } = await supabase
      .from("post_reposts")
      .select("post_id, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (repostError) return;

    const reposts = (repostRows ?? []) as Array<{
      post_id: string;
      created_at: string;
    }>;
    const postIds = reposts.map((row) => row.post_id);

    if (!postIds.length) {
      setProfileReposts([]);
      return;
    }

    const { data: postRows, error: postsError } = await supabase
      .from("posts")
      .select(
        "id, author_id, content, media_url, media_type, created_at, pinned_at, archived_at, trashed_at, post_likes(count), post_comments(count)",
      )
      .in("id", postIds)
      .is("archived_at", null)
      .is("trashed_at", null);

    if (postsError) return;

    const rows = (postRows ?? []) as Array<
      Post & {
        post_likes?: { count: number }[];
        post_comments?: { count: number }[];
      }
    >;
    const authorIds = [...new Set(rows.map((row) => row.author_id))];
    const tagMap = await loadPostTags(postIds);

    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("*").in("id", authorIds)
      : { data: [] as Profile[] };

    const profileMap = new Map(
      (profiles ?? []).map((item) => [item.id, item as Profile]),
    );

    const { data: myLikes } = await supabase
      .from("post_likes")
      .select("post_id, created_at")
      .eq("user_id", session.user.id)
      .in("post_id", postIds);

    const likedSet = new Set(
      (myLikes ?? []).map((item) => item.post_id),
    );
    const likedAtMap = new Map(
      (myLikes ?? []).map((item) => [item.post_id, item.created_at]),
    );
    const repostedAtMap = new Map(
      reposts.map((item) => [item.post_id, item.created_at]),
    );

    const postOrder = new Map(
      postIds.map((postId, index) => [postId, index]),
    );

    setProfileReposts(
      rows
        .sort(
          (a, b) =>
            (postOrder.get(a.id) ?? 0) - (postOrder.get(b.id) ?? 0),
        )
        .map((row) => ({
          id: row.id,
          author_id: row.author_id,
          content: row.content,
          media_url: row.media_url,
          media_type: row.media_type ?? null,
          created_at: row.created_at,
          profile: profileMap.get(row.author_id),
          likes: row.post_likes?.[0]?.count ?? 0,
          liked: likedSet.has(row.id),
          liked_at: likedAtMap.get(row.id) ?? null,
          comments: row.post_comments?.[0]?.count ?? 0,
          reposts: 0,
          shares: 0,
          pinned_at: row.pinned_at ?? null,
          archived_at: row.archived_at ?? null,
          trashed_at: row.trashed_at ?? null,
          tagged_profiles: tagMap.get(row.id) ?? [],
          reposted: true,
          reposted_at: repostedAtMap.get(row.id) ?? null,
        })),
    );
  }

  async function loadPublicProfile(userId: string) {
    if (!supabase || !session?.user || userId === session.user.id) {
      setView("profile");
      setViewAs(false);
      return;
    }

    const { data: target } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!target) return;

    const targetProfile = target as Profile;
    const { data: targetPosts } = await supabase
      .from("posts")
      .select("id, author_id, content, media_url, media_type, created_at, pinned_at, archived_at, trashed_at, post_likes(count), post_comments(count)")
      .eq("author_id", userId).is("archived_at", null).is("trashed_at", null).order("pinned_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(50);

    const rows = (targetPosts ?? []) as Array<Post & { post_likes?: { count: number }[]; post_comments?: { count: number }[] }>;
    const postIds = rows.map((row) => row.id);
    const tagMap = await loadPostTags(postIds);
    const { data: myLikes } = postIds.length
      ? await supabase.from("post_likes").select("post_id, created_at").eq("user_id", session.user.id).in("post_id", postIds)
      : { data: [] as { post_id: string; created_at: string }[] };

    const likedSet = new Set((myLikes ?? []).map((item) => item.post_id));
    const likedAtMap = new Map((myLikes ?? []).map((item) => [item.post_id, item.created_at]));
    setPublicProfilePosts(rows.map((row) => ({
      id: row.id, author_id: row.author_id, content: row.content, media_url: row.media_url,
      media_type: row.media_type ?? null, created_at: row.created_at, profile: targetProfile, likes: row.post_likes?.[0]?.count ?? 0,
      liked: likedSet.has(row.id), liked_at: likedAtMap.get(row.id) ?? null, comments: row.post_comments?.[0]?.count ?? 0,
      reposts: 0, shares: 0, pinned_at: row.pinned_at ?? null, archived_at: row.archived_at ?? null, trashed_at: row.trashed_at ?? null, tagged_profiles: tagMap.get(row.id) ?? [], reposted: false,
    })));

    const { data: targetHighlights } = await supabase.from("profile_highlights")
      .select("id, user_id, title, image_url, created_at").eq("user_id", userId).order("created_at", { ascending: true });
    setPublicHighlights((targetHighlights ?? []) as Highlight[]);

    const { data: myFollow } = await supabase.from("user_follows").select("follower_id")
      .eq("follower_id", session.user.id).eq("following_id", userId).maybeSingle();
    const { data: reverseFollow } = await supabase.from("user_follows").select("follower_id")
      .eq("follower_id", userId).eq("following_id", session.user.id).maybeSingle();

    setFollowingPublicProfile(Boolean(myFollow));
    setFollowedByPublicProfile(Boolean(reverseFollow));
    setPublicProfileFriend(Boolean(myFollow && reverseFollow));
    setPublicProfile(targetProfile);
    try {
      sessionStorage.setItem(PUBLIC_PROFILE_KEY, userId);
    } catch {
      // Ignore unavailable session storage; the current view still works.
    }
    await loadProfileStats(userId);
    setView("public");
    setViewAs(false);
  }

  async function toggleFollowPublicProfile() {
    if (!supabase || !session?.user || !publicProfile) return;

    if (followingPublicProfile) {
      const { error } = await supabase.from("user_follows").delete()
        .eq("follower_id", session.user.id).eq("following_id", publicProfile.id);
      if (!error) {
        setFollowingPublicProfile(false);
        setPublicProfileFriend(false);
      }
      return;
    }

    const { error } = await supabase.from("user_follows").insert({
      follower_id: session.user.id, following_id: publicProfile.id,
    });
    if (!error) {
      setFollowingPublicProfile(true);
      setPublicProfileFriend(followedByPublicProfile);
    }
  }

  async function loadDiscoverProfiles() {
    if (!supabase || !session?.user) return;
    const { data } = await supabase.from("profiles").select("*").neq("id", session.user.id).order("display_name").limit(50);
    setDiscoverProfiles((data ?? []) as Profile[]);
  }

  async function openMessageConversation() {
    if (!supabase || !session?.user || !publicProfile || !publicProfileFriend) return;
    let low = session.user.id, high = publicProfile.id;
    if (low > high) [low, high] = [high, low];

    const { data } = await supabase.from("conversations").select("id, user_low, user_high")
      .eq("user_low", low).eq("user_high", high).maybeSingle();
    let conversation = data;
    if (!conversation) {
      const { data: created } = await supabase.from("conversations")
        .insert({ user_low: low, user_high: high }).select("id, user_low, user_high").single();
      conversation = created;
    }
    if (!conversation) return;
    setActiveConversation(conversation.id);
    await loadConversationMessages(conversation.id);
    await loadDiscoverProfiles();
  }

  async function loadConversationMessages(conversationId: string) {
    if (!supabase || !session?.user) return;
    const { data } = await supabase.from("messages").select("id, sender_id, content, created_at")
      .eq("conversation_id", conversationId).order("created_at", { ascending: true });
    setMessagesByConversation((current) => ({ ...current, [conversationId]: (data ?? []) as Array<{ id: string; sender_id: string; content: string; created_at: string }> }));
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !session?.user || !activeConversation || !messageDraft.trim()) return;
    const content = messageDraft.trim();
    const { data, error } = await supabase.from("messages").insert({
      conversation_id: activeConversation, sender_id: session.user.id, content,
    }).select("id, sender_id, content, created_at").single();
    if (error || !data) return;
    setMessagesByConversation((current) => ({
      ...current,
      [activeConversation]: [...(current[activeConversation] ?? []), data as { id: string; sender_id: string; content: string; created_at: string }],
    }));
    setMessageDraft("");
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

    if (!supabase || !session?.user) {
      return;
    }

    const title = highlightTitle.trim();

    if (!title) {
      setProfileError("Please enter a title for the highlight.");
      return;
    }

    setHighlightBusy(true);
    setProfileError("");

    let imageUrl = highlightImage.trim() || null;

    try {
      if (highlightFile) {
        const extension =
          highlightFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-highlights")
          .upload(filePath, highlightFile, {
            cacheControl: "3600",
            contentType: highlightFile.type || "image/jpeg",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        const { data: publicUrl } = supabase.storage
          .from("profile-highlights")
          .getPublicUrl(filePath);

        imageUrl = publicUrl.publicUrl;
      }

      const { data, error: saveError } = await supabase
        .from("profile_highlights")
        .insert({
          user_id: session.user.id,
          title,
          image_url: imageUrl,
        })
        .select("id, user_id, title, image_url, created_at")
        .single();

      if (saveError) {
        throw new Error(`Could not save highlight: ${saveError.message}`);
      }

      if (!data) {
        throw new Error("Could not save highlight: no record was returned.");
      }

      setHighlights((current) => [
        ...current,
        data as Highlight,
      ]);

      setHighlightTitle("");
      setHighlightImage("");
      setHighlightFile(null);
      setProfileError("");
      setHighlightOpen(false);
    } catch (highlightError) {
      console.error("RP WORLD highlight save failed", highlightError);
      setProfileError(
        highlightError instanceof Error
          ? highlightError.message
          : "Could not save highlight. Please try again.",
      );
    } finally {
      setHighlightBusy(false);
    }
  }

  async function repostPost(post: Post) {
    if (!supabase || !session?.user || repostBusy === post.id) return;

    setRepostBusy(post.id);
    const { error: repostError } = await supabase.from("post_reposts").insert({
      post_id: post.id,
      user_id: session.user.id,
    });

    if (repostError && repostError.code !== "23505") {
      setFeedError("Could not repost this post. Please try again.");
      setRepostBusy(null);
      return;
    }

    setPosts((current) => current.map((item) =>
      item.id === post.id
        ? { ...item, reposted: true, reposts: item.reposted ? item.reposts : item.reposts + 1 }
        : item
    ));
    setProfilePosts((current) => current.map((item) =>
      item.id === post.id
        ? { ...item, reposted: true, reposts: item.reposted ? item.reposts : item.reposts + 1 }
        : item
    ));
    setPublicProfilePosts((current) => current.map((item) =>
      item.id === post.id
        ? { ...item, reposted: true, reposts: item.reposted ? item.reposts : item.reposts + 1 }
        : item
    ));

    setRepostBusy(null);
  }

  async function createPost(event: FormEvent) {
    event.preventDefault();

    if (!supabase || !session?.user || (!postText.trim() && !postMediaFile)) return;

    if (postMediaFile) {
      const mediaError = validatePostMedia(postMediaFile);
      if (mediaError) {
        setFeedError(mediaError);
        return;
      }
    }

    setPostBusy(true);
    setFeedError("");

    try {
      const mediaUrl = postMediaFile ? await uploadPostMedia(postMediaFile) : null;
      const mediaType = postMediaFile?.type || null;

      const { error: saveError } = await supabase.from("posts").insert({
        author_id: session.user.id,
        content: postText.trim(),
        media_url: mediaUrl,
        media_type: mediaType,
      });

      if (saveError) throw saveError;

      setPostText("");
      setPostMediaFile(null);
      setComposerOpen(false);
      await loadFeed();
      if (view === "profile") await loadProfilePosts();
    } catch (saveError) {
      setFeedError(
        saveError instanceof Error
          ? saveError.message
          : "We could not publish that post.",
      );
    } finally {
      setPostBusy(false);
    }
  }

  function openEditPost(post: Post) {
    if (!session?.user || post.author_id !== session.user.id || post.shared_post_id) return;
    setEditPostTarget(post);
    setEditPostText(post.content);
    setEditPostMediaFile(null);
    setEditPostMediaRemove(false);
    setFeedError("");
    setEditPostOpen(true);
  }

  async function saveEditedPost(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !session?.user || !editPostTarget || editPostBusy) return;

    const content = editPostText.trim();
    const resultingMedia = editPostMediaFile
      ? true
      : editPostMediaRemove
        ? false
        : Boolean(editPostTarget.media_url);

    if (!content && !resultingMedia) {
      setFeedError("Add some text, a photo, or a video before saving.");
      return;
    }

    if (editPostMediaFile) {
      const mediaError = validatePostMedia(editPostMediaFile);
      if (mediaError) {
        setFeedError(mediaError);
        return;
      }
    }

    setEditPostBusy(true);
    setFeedError("");

    try {
      let mediaUrl = editPostTarget.media_url;
      let mediaType = editPostTarget.media_type ?? (mediaUrl ? "image/*" : null);

      if (editPostMediaRemove) {
        mediaUrl = null;
        mediaType = null;
      } else if (editPostMediaFile) {
        mediaUrl = await uploadPostMedia(editPostMediaFile);
        mediaType = editPostMediaFile.type;
      }

      const { data, error: updateError } = await supabase
        .from("posts")
        .update({ content, media_url: mediaUrl, media_type: mediaType })
        .eq("id", editPostTarget.id)
        .eq("author_id", session.user.id)
        .select("id, content, media_url, media_type")
        .single();

      if (updateError || !data) {
        throw new Error(updateError?.message || "We could not update that post.");
      }

      const updatePost = (items: Post[]) =>
        items.map((item) =>
          item.id === editPostTarget.id
            ? {
                ...item,
                content: data.content,
                media_url: data.media_url,
                media_type: data.media_type,
              }
            : item,
        );

      setPosts(updatePost);
      setProfilePosts(updatePost);
      setPublicProfilePosts(updatePost);
      setEditPostOpen(false);
      setEditPostTarget(null);
      setEditPostText("");
      setEditPostMediaFile(null);
      setEditPostMediaRemove(false);
      setMessage("Post updated.");
    } catch (updateError) {
      setFeedError(
        updateError instanceof Error
          ? updateError.message
          : "We could not update that post.",
      );
    } finally {
      setEditPostBusy(false);
    }
  }

  async function loadComments(postId: string) {
    if (!supabase || !session?.user) return;

    let data: unknown[] | null = null;
    let loadError: { message?: string } | null = null;

    const nestedResult = await supabase
      .from("post_comments")
      .select(
        "id, post_id, author_id, content, created_at, parent_id",
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    data = nestedResult.data as unknown[] | null;
    loadError = nestedResult.error;

    // Keep existing comments visible even if the database has not
    // received the nested-reply migration yet.
    if (loadError) {
      const legacyResult = await supabase
        .from("post_comments")
        .select(
          "id, post_id, author_id, content, created_at",
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (!legacyResult.error) {
        data = (legacyResult.data ?? []).map((row) => ({
          ...row,
          parent_id: null,
        }));
        loadError = null;
      }
    }

    if (loadError) {
      console.error("RP WORLD comments could not be loaded", loadError);
      setFeedError(loadError.message || "Comments could not be loaded.");
      return;
    }

    const rows = (data ?? []) as Comment[];

    const commentIds = rows.map((row) => row.id);
    const { data: reactions } = commentIds.length
      ? await supabase
          .from("comment_reactions")
          .select("comment_id, user_id, reaction_type")
          .in("comment_id", commentIds)
      : { data: [] as { comment_id: string; user_id: string; reaction_type: string }[] };

    const reactionRows = (reactions ?? []) as { comment_id: string; user_id: string; reaction_type: string }[];
    const reactionCounts = new Map<string, number>();
    const reactionTypes = new Map<string, string>();
    reactionRows.forEach((reaction) => {
      reactionCounts.set(reaction.comment_id, (reactionCounts.get(reaction.comment_id) ?? 0) + 1);
      if (reaction.user_id === session.user.id) reactionTypes.set(reaction.comment_id, reaction.reaction_type);
    });

    const authorIds = [
      ...new Set(rows.map((row) => row.author_id)),
    ];

    const { data: profiles } = authorIds.length
      ? await supabase
          .from("profiles")
          .select("*")
          .in("id", authorIds)
      : { data: [] as Profile[] };

    const profileMap = new Map(
      (profiles ?? []).map((item) => [
        item.id,
        item as Profile,
      ]),
    );

    setCommentsByPost((current) => ({
      ...current,
      [postId]: rows.map((row) => ({
        ...row,
        reactionCount: reactionCounts.get(row.id) ?? 0,
        reactionType: reactionTypes.get(row.id) ?? null,
        profile: profileMap.get(row.author_id),
      })),
    }));
  }

  async function toggleComments(postId: string) {
    const next =
      openComments === postId ? null : postId;

    setOpenComments(next);

    if (next && !commentsByPost[postId]) {
      await loadComments(postId);
    }
  }

  async function createComment(
    event: FormEvent,
    postId: string,
  ) {
    event.preventDefault();

    if (!supabase || !session?.user) return;

    const content = (
      commentDrafts[postId] ?? ""
    ).trim();

    if (!content) return;

    setCommentBusy(postId);

    const parentId =
      replyTo?.postId === postId ? replyTo.commentId : null;

    let { data, error: saveError } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        author_id: session.user.id,
        content,
        parent_id: parentId,
      })
      .select(
        "id, post_id, author_id, content, created_at, parent_id",
      )
      .single();

    // Gracefully support databases that still have the original
    // comment schema. Top-level comments can still be posted while
    // nested replies require the parent_id migration.
    if (saveError && !parentId) {
      const legacyInsert = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          author_id: session.user.id,
          content,
        })
        .select(
          "id, post_id, author_id, content, created_at",
        )
        .single();

      if (!legacyInsert.error && legacyInsert.data) {
        data = {
          ...legacyInsert.data,
          parent_id: null,
        } as typeof data;
        saveError = null;
      }
    }

    setCommentBusy(null);

    if (saveError || !data) {
      console.error("RP WORLD comment could not be posted", saveError);
      setFeedError(
        saveError?.message ||
          (parentId
            ? "This reply could not be posted. Please make sure the nested-reply database migration is applied."
            : "This comment could not be posted. Please try again."),
      );
      return;
    }

    const newComment = {
      ...(data as Comment),
      reactionCount: 0,
      reactionType: null,
      profile: profile ?? undefined,
    };

    setCommentsByPost((current) => ({
      ...current,
      [postId]: [
        ...(current[postId] ?? []),
        newComment,
      ],
    }));

    setCommentDrafts((current) => ({
      ...current,
      [postId]: "",
    }));
    setReplyTo(null);
    setFeedError("");

    setPosts((current) =>
      current.map((item) =>
        item.id === postId
          ? {
              ...item,
              comments: item.comments + 1,
            }
          : item,
      ),
    );
  }

  async function setCommentReaction(postId: string, comment: Comment, reactionType: string) {
    if (!supabase || !session?.user || commentReactionBusy === comment.id) return;

    setCommentReactionBusy(comment.id);
    setOpenReactionPicker(null);

    const previousType = comment.reactionType;
    const nextType = previousType === reactionType ? null : reactionType;
    const countDelta = previousType ? 0 : nextType ? 1 : -1;

    setCommentsByPost((current) => ({
      ...current,
      [postId]: (current[postId] ?? []).map((item) =>
        item.id === comment.id
          ? {
              ...item,
              reactionType: nextType,
              reactionCount: Math.max(0, item.reactionCount + countDelta),
            }
          : item,
      ),
    }));

    const result = previousType
      ? nextType
        ? await supabase.from("comment_reactions").update({ reaction_type: nextType }).eq("comment_id", comment.id).eq("user_id", session.user.id)
        : await supabase.from("comment_reactions").delete().eq("comment_id", comment.id).eq("user_id", session.user.id)
      : await supabase.from("comment_reactions").insert({
          comment_id: comment.id,
          user_id: session.user.id,
          reaction_type: nextType,
        });

    setCommentReactionBusy(null);

    if (result.error) {
      setCommentsByPost((current) => ({
        ...current,
        [postId]: (current[postId] ?? []).map((item) =>
          item.id === comment.id
            ? { ...item, reactionType: previousType, reactionCount: comment.reactionCount }
            : item,
        ),
      }));
      setFeedError("Could not update the reaction. Please try again.");
    }
  }

  function renderCommentTree(postId: string, comments: Comment[], parentId: string | null, depth = 0): ReactNode[] {
    return comments.filter((comment) => comment.parent_id === parentId).map((comment) => (
      <div key={comment.id}>
        <div className={`comment-row${replyTo?.commentId === comment.id ? " reply-target" : ""}`} style={{ marginLeft: Math.min(depth, 5) * 28 }}>
          <button className="avatar small-avatar profile-link-button" type="button" onClick={() => void loadPublicProfile(comment.author_id)} aria-label="Open profile"
            style={comment.profile?.avatar_url ? { backgroundImage: `url(${comment.profile.avatar_url})` } : undefined}>
            {!comment.profile?.avatar_url && initials(comment.profile?.display_name ?? "RP")}
          </button>
          <div>
            <div className="comment-head">
              <button className="profile-name-link" type="button" onClick={() => void loadPublicProfile(comment.author_id)}>
                {comment.profile?.display_name ?? "RP WORLD member"}
              </button>
              <button className="timestamp-button" type="button" onClick={() => setOpenTimestamp(openTimestamp === comment.id ? null : comment.id)} title="Show exact date and time">
                <Clock size={10} /> {timeAgo(comment.created_at)}
              </button>
            </div>
            <p>{comment.content}</p>
            <div className="comment-actions">
              <div className="comment-reaction-wrap">
                <button
                  className={comment.reactionType ? "comment-action reaction-active" : "comment-action"}
                  type="button"
                  onClick={() => setOpenReactionPicker(openReactionPicker === comment.id ? null : comment.id)}
                  disabled={commentReactionBusy === comment.id}
                  aria-label={comment.reactionType ? "Change reaction" : "Choose reaction"}
                  aria-expanded={openReactionPicker === comment.id}
                >
                  <span className="comment-reaction-emoji">{reactionEmoji(comment.reactionType)}</span>
                  {comment.reactionCount > 0 ? comment.reactionCount : "Like"}
                </button>

                {openReactionPicker === comment.id && (
                  <div className="comment-reaction-picker" role="menu" aria-label="Choose a reaction">
                    {commentReactionOptions.map((reaction) => (
                      <button
                        key={reaction.type}
                        className={comment.reactionType === reaction.type ? "comment-reaction-option active" : "comment-reaction-option"}
                        type="button"
                        role="menuitem"
                        title={reaction.label}
                        aria-label={reaction.label}
                        onClick={() => void setCommentReaction(postId, comment, reaction.type)}
                      >
                        <span>{reaction.emoji}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className="comment-action" type="button" onClick={() => { setReplyTo({ postId, commentId: comment.id }); setOpenComments(postId); }}>
                Reply
              </button>
            </div>
            {openTimestamp === comment.id && (
              <div className="timestamp-popover comment-time"><strong>Posted</strong><span>{exactTime(comment.created_at)}</span></div>
            )}
          </div>
        </div>
        {renderCommentTree(postId, comments, comment.id, depth + 1)}
      </div>
    ));
  }

  function sharePost(post: Post) {
    setShareTarget(post);
    setShareCaption("");
    setShareOpen(true);
  }

  async function sharePostToFeed() {
    if (!supabase || !session?.user || !shareTarget) return;
    setShareBusy(true);
    const caption = shareCaption.trim();
    const { data, error: shareError } = await supabase
      .from("posts")
      .insert({
        author_id: session.user.id,
        content: caption || "Shared a post",
        media_url: shareTarget.media_url,
        media_type: shareTarget.media_type ?? null,
        shared_post_id: shareTarget.shared_post_id ?? shareTarget.id,
        share_caption: caption || null,
      })
      .select("id, author_id, content, media_url, media_type, created_at, shared_post_id, share_caption")
      .single();
    setShareBusy(false);
    if (shareError || !data) {
      setMessage("Could not share this post right now.");
      return;
    }
    const sharedOriginal = shareTarget.shared_post_id
      ? shareTarget.shared_original
      : { content: shareTarget.content, media_url: shareTarget.media_url, media_type: shareTarget.media_type ?? null, created_at: shareTarget.created_at, profile: shareTarget.profile };
    const sharedPost: Post = {
      id: data.id, author_id: data.author_id, content: data.content, media_url: data.media_url,
      created_at: data.created_at, profile: profile ?? undefined, likes: 0, liked: false,
      liked_at: null, comments: 0, reposts: 0, shares: (shareTarget.shares ?? 0) + 1, reposted: false, shared_post_id: data.shared_post_id,
      share_caption: data.share_caption, shared_original: sharedOriginal,
    };
    setPosts((current) => [sharedPost, ...current]);
    setShareOpen(false); setShareTarget(null); setShareCaption("");
    setMessage("Post shared to your feed.");
  }

  async function managePostAction(action: "pin" | "archive" | "trash" | "copy") {
    const post = postActionTarget;
    if (!supabase || !session?.user || !post || post.author_id !== session.user.id || post.shared_post_id) return;

    if (action === "copy") {
      const url = new URL(window.location.href);
      url.hash = `post-${post.id}`;
      try {
        await navigator.clipboard.writeText(url.toString());
        setMessage("Post link copied.");
      } catch {
        setMessage("Could not copy the post link.");
      }
      setPostActionTarget(null);
      return;
    }

    setPostActionBusy(true);
    const payload =
      action === "pin"
        ? {
            pinned_at: post.pinned_at ? null : new Date().toISOString(),
          }
        : action === "archive"
          ? {
              archived_at: new Date().toISOString(),
              trashed_at: null,
              pinned_at: null,
            }
          : {
              trashed_at: new Date().toISOString(),
              archived_at: null,
              pinned_at: null,
            };

    const { data, error: updateError } = await supabase
      .from("posts")
      .update(payload)
      .eq("id", post.id)
      .eq("author_id", session.user.id)
      .select("id, pinned_at, archived_at, trashed_at")
      .single();

    setPostActionBusy(false);

    if (updateError || !data) {
      setMessage(updateError?.message || "Could not update this post.");
      return;
    }

    const patchPost = (item: Post): Post =>
      item.id === post.id
        ? {
            ...item,
            pinned_at: data.pinned_at ?? null,
            archived_at: data.archived_at ?? null,
            trashed_at: data.trashed_at ?? null,
          }
        : item;

    const removeFromVisible = action === "archive" || action === "trash";
    setPosts((current) => current.map(patchPost).filter((item) => !item.archived_at && !item.trashed_at));
    setProfilePosts((current) => current.map(patchPost).filter((item) => !item.archived_at && !item.trashed_at));
    setProfileReposts((current) => current.map(patchPost).filter((item) => !item.archived_at && !item.trashed_at));

    setPostActionTarget(null);

    if (action === "pin") {
      setMessage(post.pinned_at ? "Post unpinned." : "Post pinned to your profile.");
    } else if (removeFromVisible) {
      setMessage(action === "archive" ? "Post moved to archive." : "Post moved to trash. It will be permanently deleted after 30 days.");
    }
  }

  async function openTagPost(post: Post) {
    if (!session?.user || post.author_id !== session.user.id || post.shared_post_id) return;
    setPostActionTarget(null);
    const tagMap = await loadPostTags([post.id]);
    const taggedProfiles = tagMap.get(post.id) ?? [];
    setTagPostTarget({ ...post, tagged_profiles: taggedProfiles });
    setTagSearch("");
    setTaggedUserIds(new Set(taggedProfiles.map((item) => item.id)));
  }

  async function savePostTags() {
    if (!supabase || !session?.user || !tagPostTarget || tagPostTarget.author_id !== session.user.id) return;
    setTagBusy(true);

    const { error: deleteError } = await supabase
      .from("post_tags")
      .delete()
      .eq("post_id", tagPostTarget.id);

    if (deleteError) {
      setTagBusy(false);
      setMessage("Could not update tags.");
      return;
    }

    const selectedIds = [...taggedUserIds].filter((id) => id !== session.user.id);
    if (selectedIds.length) {
      const { error: insertError } = await supabase
        .from("post_tags")
        .insert(selectedIds.map((userId) => ({ post_id: tagPostTarget.id, user_id: userId })));

      if (insertError) {
        setTagBusy(false);
        setMessage("Could not save the selected tags.");
        return;
      }
    }

    const tagMap = await loadPostTags([tagPostTarget.id]);
    const taggedProfiles = tagMap.get(tagPostTarget.id) ?? [];
    setPosts((current) => current.map((item) => item.id === tagPostTarget.id ? { ...item, tagged_profiles: taggedProfiles } : item));
    setProfilePosts((current) => current.map((item) => item.id === tagPostTarget.id ? { ...item, tagged_profiles: taggedProfiles } : item));
    setTagBusy(false);
    setTagPostTarget(null);
    setMessage(taggedProfiles.length ? "Post tags updated." : "Post tags cleared.");
  }

  function toggleTagUser(userId: string) {
    setTaggedUserIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSavedPost(post: Post) {
    setSavedPostIds((current) => {
      const next = new Set(current);
      if (next.has(post.id)) next.delete(post.id); else next.add(post.id);
      return next;
    });
    setMessage(savedPostIds.has(post.id) ? "Removed from saved." : "Post saved.");
  }

  async function sharePostExternally(post: Post) {
    const original = post.shared_original ?? post;
    const shareText = post.share_caption?.trim() ? post.share_caption.trim() + "\n\n" + original.content : original.content;
    const shareData = {
      title: original.profile?.display_name ? original.profile.display_name + " on RP WORLD" : "RP WORLD post",
      text: shareText,
      url: window.location.href,
    };
    try {
      if (navigator.share) { await navigator.share(shareData); return; }
      if (navigator.clipboard) { await navigator.clipboard.writeText(shareText + "\n\n" + shareData.url); setMessage("Post link copied to clipboard."); return; }
      setMessage("Sharing is not available in this browser.");
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setMessage("Could not share this post right now.");
    }
  }

  async function toggleLike(post: Post) {
    if (!supabase || !session?.user) return;

    const nextLikedAt = post.liked ? null : new Date().toISOString();
    const nextLikes = post.likes + (post.liked ? -1 : 1);

    const updateLikedPost = (item: Post) =>
      item.id === post.id
        ? { ...item, liked: !item.liked, liked_at: nextLikedAt, likes: nextLikes }
        : item;

    setPosts((current) => current.map(updateLikedPost));
    setProfilePosts((current) => current.map(updateLikedPost));
    setProfileReposts((current) => current.map(updateLikedPost));

    const result = post.liked
      ? await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", session.user.id)
      : await supabase
          .from("post_likes")
          .insert({
            post_id: post.id,
            user_id: session.user.id,
          });

    if (result.error) {
      const restorePost = (item: Post) =>
        item.id === post.id
          ? { ...item, liked: post.liked, liked_at: post.liked_at, likes: post.likes }
          : item;

      setPosts((current) => current.map(restorePost));
      setProfilePosts((current) => current.map(restorePost));
      setProfileReposts((current) => current.map(restorePost));
    }
  }

  async function handleLogout() {
    if (!supabase) return;

    await supabase.auth.signOut();

    setSession(null);
    setProfile(null);
    setPublicProfile(null);
    setPublicProfilePosts([]);
    setPublicHighlights([]);
    setActiveConversation(null);
    setMessagesByConversation({});
    setMessageDraft("");
    setPosts([]);
    setProfilePosts([]);
    setProfileReposts([]);
    setProfileSection("posts");
    setHighlights([]);
    setView("home");
    try {
      sessionStorage.removeItem(VIEW_KEY);
      sessionStorage.removeItem(PUBLIC_PROFILE_KEY);
    } catch {
      // Ignore unavailable session storage.
    }
    setViewAs(false);
    setProfileOpen(false);
  }

  return (
    <div className={isDark ? "app dark" : "app light"}>
      <header className="topbar glass">
        <button
          className="brand-button"
          type="button"
          onClick={() => setView("home")}
          aria-label="RP WORLD home"
        >
          <span className="brand-mark">
            <img src="/rp-world-mark.svg" alt="" aria-hidden="true" />
          </span>

          <span>
            <small>ROLE PLAY WORLD</small>
            <strong>RP WORLD</strong>
          </span>
        </button>

        <div className="header-actions">
          <ThemePicker
            theme={theme}
            onThemeChange={setTheme}
          />

          <button
            className="theme-toggle"
            type="button"
            aria-label={
              isDark
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            onClick={() =>
              setAppearance(
                isDark ? "light" : "dark",
              )
            }
          >
            <span
              className={
                isDark
                  ? "toggle-thumb dark-thumb"
                  : "toggle-thumb"
              }
            >
              {isDark ? (
                <Moon size={15} />
              ) : (
                <Sun size={15} />
              )}
            </span>
          </button>

          {session ? (
            <button
              className="auth-icon-button glass"
              type="button"
              aria-label="Sign out"
              onClick={handleLogout}
            >
              <LogOut size={17} />
            </button>
          ) : (
            <button
              className="auth-icon-button glass"
              type="button"
              aria-label="Open account"
              onClick={() => {
                setAuthMode("login");
                setAuthOpen(true);
                resetAuthMessages();
              }}
            >
              <LogIn size={17} />
            </button>
          )}
        </div>
      </header>

      {!session || !profile ? (
        <main className="hero">
          <div className="hero-icon glass">
            <img src="/rp-world-mark.svg" alt="" aria-hidden="true" />
          </div>

          <p className="eyebrow">
            {session ? "ACCESS GRANTED" : "RP WORLD"}
          </p>

          <h2>
            {session
              ? "Build your RP identity."
              : "Your RP world. Your identity. Your unique aesthetic."}
          </h2>

          <p className="hero-copy">
            {session
              ? "One account, one RP identity, and a profile that belongs to you."
              : "A vibrant social universe for role players, creative communities, storytellers, and entertainment enthusiasts."}
          </p>

          {session ? (
            <button
              className="primary-button"
              type="button"
              onClick={() => setProfileOpen(true)}
            >
              <UserPlus size={17} />
              Set up profile
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setAuthOpen(true);
                resetAuthMessages();
              }}
            >
              <UserPlus size={17} />
              Create your account
            </button>
          )}

          <div className="status glass">
            <span className="status-dot" />

            {supabaseConfigured
              ? session
                ? "Secure session · profile setup"
                : "Secure foundation"
              : "Supabase setup required"}
          </div>

          {profileError && (
            <p className="form-message error standalone-error">
              {profileError}
            </p>
          )}
        </main>
      ) : (
        <main className="social-shell">
          <section className="feed-column">
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  RP WORLD FEED
                </p>

                <h2>{title}</h2>
              </div>

              <div className="page-heading-actions">
                <button
                  className="glass circle-button"
                  type="button"
                  aria-label="Search"
                  onClick={() =>
                    setView("discover")
                  }
                >
                  <Search size={17} />
                </button>

                {(view === "public" || viewAs) && (
                  <button
                    className="glass circle-button"
                    type="button"
                    onClick={() => {
                      if (view === "public") {
                        setView("discover");
                        setPublicProfile(null);
                      } else {
                        setViewAs(false);
                        setView("profile");
                      }
                    }}
                    aria-label="Back"
                    title="Back"
                  >
                    <ArrowLeft size={17} />
                  </button>
                )}
              </div>
            </div>

            {view === "home" && (
              <>
                <button
                  className="composer glass"
                  type="button"
                  onClick={() =>
                    setComposerOpen(true)
                  }
                >
                  <span
                    className="avatar"
                    style={
                      profile.avatar_url
                        ? {
                            backgroundImage: `url(${profile.avatar_url})`,
                          }
                        : undefined
                    }
                  >
                    {!profile.avatar_url &&
                      initials(profile.display_name)}
                  </span>

                  <span>
                    Share something with the world…
                  </span>

                  <Plus size={18} />
                </button>

                {feedError && (
                  <p className="form-message error standalone-error">
                    {feedError}
                  </p>
                )}

                <div className="feed-list">
                  {posts.length === 0 ? (
                    <div className="empty-state glass">
                      <Sparkles size={22} />

                      <strong>
                        Your world is quiet.
                      </strong>

                      <span>
                        Be the first to drop a post
                        and start the feed.
                      </span>

                      <button
                        className="primary-button"
                        type="button"
                        onClick={() =>
                          setComposerOpen(true)
                        }
                      >
                        Create the first post
                      </button>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <article
                        id={`post-${post.id}`}
                        className={post.shared_post_id ? "post-card glass shared-post-card" : "post-card glass"}
                        key={post.id}
                      >
                        {post.shared_post_id && (
                          <>
                            <div className="shared-by-label"><Share2 size={14} /><span>{post.profile?.display_name ?? "Someone"} shared this</span></div>
                            {post.share_caption && <p className="share-caption">{post.share_caption}</p>}
                          </>
                        )}
                        <div className="post-head">
                          <button
                            className="avatar profile-link-button"
                            type="button"
                            aria-label={`Open ${post.profile?.display_name ?? "member"} profile`}
                            onClick={() => void loadPublicProfile(post.author_id)}
                            style={
                              post.profile?.avatar_url
                                ? {
                                    backgroundImage: `url(${post.profile.avatar_url})`,
                                  }
                                : undefined
                            }
                          >
                            {!post.profile
                              ?.avatar_url &&
                              initials(
                                post.profile
                                  ?.display_name ??
                                  "RP",
                              )}
                          </button>

                          <div>
                            {post.author_id === session?.user.id && !post.shared_post_id && (
                              <button
                                className="post-more-button"
                                type="button"
                                aria-label="Post options"
                                title="Post options"
                                onClick={() => setPostActionTarget(post)}
                              >
                                <MoreVertical size={18} />
                              </button>
                            )}
                            <button
                              className="profile-name-link"
                              type="button"
                              onClick={() => void loadPublicProfile(post.author_id)}
                            >
                              {post.profile
                                ?.display_name ??
                                "RP WORLD member"}
                            </button>

                            <span className="post-meta">
                              @
                              {post.profile
                                ?.username ??
                                "member"}{" "}
                              ·{" "}
                              <button
                                className="timestamp-button"
                                type="button"
                                onClick={() =>
                                  setOpenTimestamp(
                                    openTimestamp === post.id ? null : post.id,
                                  )
                                }
                                title="Show exact date and time"
                              >
                                <Clock size={11} />
                                {timeAgo(post.created_at)}
                              </button>
                            </span>
                            {openTimestamp === post.id && (
                              <div className="timestamp-popover">
                                <strong>Posted</strong>
                                <span>{exactTime(post.created_at)}</span>
                                {post.liked && post.liked_at && (
                                  <>
                                    <strong>Liked by you</strong>
                                    <span>{exactTime(post.liked_at)}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {!post.shared_post_id ? (
                          <>
                            {renderExpandablePostContent(post.content, post.id)}
                            {renderPostMedia(post.media_url, post.media_type)}
                          </>
                        ) : (
                          <div className="shared-original">
                            <div className="shared-original-head">
                              <div className="avatar small-avatar" style={post.shared_original?.profile?.avatar_url ? { backgroundImage: `url(${post.shared_original.profile.avatar_url})` } : undefined}>
                                {!post.shared_original?.profile?.avatar_url && initials(post.shared_original?.profile?.display_name ?? "RP")}
                              </div>
                              <div>
                                <strong>{post.shared_original?.profile?.display_name ?? "RP WORLD member"}</strong>
                                <span className="post-meta">@{post.shared_original?.profile?.username ?? "member"} · {timeAgo(post.shared_original?.created_at ?? post.created_at)}</span>
                              </div>
                            </div>
                            {renderExpandablePostContent(post.shared_original?.content ?? "", `${post.id}-shared`)}
                            {renderPostMedia(post.shared_original?.media_url, post.shared_original?.media_type)}
                          </div>
                        )}

                        {post.pinned_at && (
                          <div className="post-status-label"><Pin size={12} /> Pinned</div>
                        )}
                        {post.tagged_profiles?.length ? (
                          <div className="post-tag-label"><Tag size={12} /> {post.tagged_profiles.map((item) => `@${item.username}`).join(", ")}</div>
                        ) : null}
                        <div className="post-actions">
                          <button
                            className={
                              post.liked
                                ? "post-action liked"
                                : "post-action"
                            }
                            type="button"
                            onClick={() =>
                              void toggleLike(post)
                            }
                          >
                            <Heart
                              size={17}
                              fill={
                                post.liked
                                  ? "currentColor"
                                  : "none"
                              }
                            />

                            {post.likes}
                          </button>

                          <button
                            className={
                              openComments ===
                              post.id
                                ? "post-action active"
                                : "post-action"
                            }
                            type="button"
                            onClick={() =>
                              void toggleComments(
                                post.id,
                              )
                            }
                          >
                            <MessageCircle
                              size={17}
                            />{" "}
                            {post.comments || "Reply"}
                          </button>

                                          <button
                            className={post.reposted ? "post-action reposted" : "post-action"}
                            type="button"
                            onClick={() => void repostPost(post)}
                            disabled={repostBusy === post.id}
                            title={post.reposted ? "Reposted" : "Repost"}
                          >
                            <Repeat2 size={17} />
                            {post.reposts || 0}
                          </button>

                          <button
                            className="post-action"
                            type="button"
                            onClick={() => void sharePost(post)}
                          >
                            <Share2 size={17} />
                            Share
                          </button>
                        </div>

                        {openComments ===
                          post.id && (
                          <div className="comments-panel">
                            <div className="comments-list">
                              {(
                                commentsByPost[
                                  post.id
                                ] ?? []
                              ).length === 0 ? (
                                <span className="comments-empty">
                                  No replies yet.
                                  Start the
                                  conversation.
                                </span>
                              ) : (
                                renderCommentTree(post.id, commentsByPost[post.id] ?? [], null)
                              )}
                            </div>

                            <form
                              className="comment-form"
                              onSubmit={(event) =>
                                void createComment(
                                  event,
                                  post.id,
                                )
                              }
                            >
                              <span
                                className="avatar small-avatar"
                                style={
                                  profile.avatar_url
                                    ? {
                                        backgroundImage: `url(${profile.avatar_url})`,
                                      }
                                    : undefined
                                }
                              >
                                {!profile.avatar_url &&
                                  initials(profile.display_name)}
                              </span>

                              <input
                                value={
                                  commentDrafts[
                                    post.id
                                  ] ?? ""
                                }
                                onChange={(event) =>
                                  setCommentDrafts(
                                    (current) => ({
                                      ...current,
                                      [post.id]:
                                        event.target
                                          .value,
                                    }),
                                  )
                                }
                                placeholder={replyTo?.postId === post.id ? "Write a reply to this comment…" : "Write a reply…"}
                                maxLength={500}
                                aria-label="Write a reply"
                              />

                              <button
                                type="submit"
                                disabled={
                                  commentBusy ===
                                    post.id ||
                                  !(
                                    commentDrafts[
                                      post.id
                                    ] ?? ""
                                  ).trim()
                                }
                                aria-label="Send reply"
                              >
                                {commentBusy ===
                                post.id
                                  ? "…"
                                  : "Send"}
                              </button>
                            </form>
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </>
            )}

            {view === "discover" && (
              <section className="discover-section">
                <div className="section-heading">
                  <div><p className="eyebrow">RP WORLD</p><h3>Discover people</h3></div>
                </div>
                {discoverProfiles.length === 0 ? (
                  <div className="empty-state glass"><Search size={24} /><strong>No other profiles yet.</strong><span>New RP WORLD members will appear here.</span></div>
                ) : (
                  <div className="discover-list">
                    {discoverProfiles.map((person) => (
                      <article className="discover-card glass" key={person.id}>
                        <button className="avatar profile-link-button" type="button" onClick={() => void loadPublicProfile(person.id)} aria-label={`Open ${person.display_name} profile`} style={person.avatar_url ? { backgroundImage: `url(${person.avatar_url})` } : undefined}>
                          {!person.avatar_url && initials(person.display_name)}
                        </button>
                        <div className="discover-info">
                          <button className="profile-name-link" type="button" onClick={() => void loadPublicProfile(person.id)}>{person.display_name}</button>
                          <span>@{person.username}</span>
                          <p>{person.bio || "RP WORLD member"}</p>
                        </div>
                        <button className="profile-action-button" type="button" onClick={() => void loadPublicProfile(person.id)}>View</button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {view === "profile" && (
              <section className="profile-page">
                <div className="profile-hero glass">
                  <div
                    className="profile-cover"
                    style={
                      profile.cover_url
                        ? {
                            backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.42)),url(${profile.cover_url})`,
                          }
                        : undefined
                    }
                  >

                  </div>

                  <div className="profile-main">
                    <div className="profile-avatar-wrap">
                      <div
                        className="profile-avatar avatar"
                        style={
                          profile.avatar_url
                            ? {
                                backgroundImage: `url(${profile.avatar_url})`,
                              }
                            : undefined
                        }
                      >
                        {!profile.avatar_url &&
                          initials(
                            profile.display_name,
                          )}
                      </div>
                    </div>

                    <div className="profile-identity">
                      <div className="profile-name-row">
                        <div>
                          <h2>
                            {profile.display_name}
                          </h2>

                          <span>
                            @{profile.username}
                          </span>
                        </div>
                      </div>

                      <p className="profile-bio">
                        {profile.bio ||
                          "No bio yet. Tell the world who you are."}
                      </p>

                      <div className="profile-actions profile-social-actions">
                        {!viewAs ? (
                          <>
                            <button
                              className="profile-action-button"
                              type="button"
                              onClick={() => setProfileOpen(true)}
                            >
                              <Pencil size={14} />
                              Edit
                            </button>

                            <button
                              className="profile-action-button"
                              type="button"
                              onClick={() => setViewAs(true)}
                            >
                              <Eye size={14} />
                              View as
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="profile-action-button follow-button"
                              type="button"
                              onClick={() =>
                                setMessage("Follow is ready for the public profile.")
                              }
                            >
                              <UserPlus size={14} />
                              Follow
                            </button>

                            <button
                              className="profile-action-button"
                              type="button"
                              onClick={() =>
                                setMessage("Messaging will open here once direct messaging is connected.")
                              }
                            >
                              <MessageCircle size={14} />
                              Message
                            </button>

                          </>
                        )}
                      </div>

                      <div className="profile-meta">
                        <span>
                          <Sparkles size={13} />
                          {profile.rp_id}
                        </span>

                        <span>
                          <MapPin size={13} />
                          RP WORLD
                        </span>
                      </div>

                      <div className="profile-meta profile-stats-pills" aria-label="Profile statistics">
                        <span>
                          <User size={13} />
                          {profileStats.followers} {profileStats.followers === 1 ? "follower" : "followers"}
                        </span>
                        <span>
                          <Heart size={13} />
                          {profileStats.likes} {profileStats.likes === 1 ? "like" : "likes"}
                        </span>
                        <span>
                          <Image size={13} />
                          {profilePosts.length} {profilePosts.length === 1 ? "post" : "posts"}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="profile-section">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">
                        HIGHLIGHTS
                      </p>

                      <h3>Moments</h3>
                    </div>

                    {!viewAs && (
                      <button
                        className="small-add"
                        type="button"
                        onClick={() =>
                          setHighlightOpen(true)
                        }
                      >
                        <Plus size={14} />
                        Add
                      </button>
                    )}
                  </div>

                  <div className={viewAs ? "highlights-row view-as" : "highlights-row"}>
                    {highlights.map((item) => (
                      <button
                        className={highlightStyle === "portrait" ? "highlight-card highlight-card-portrait" : "highlight-card highlight-card-circle"}
                        key={item.id}
                        type="button"
                        onClick={() => setActiveHighlight(item)}
                        aria-label={`Open highlight: ${item.title}`}
                      >
                        <span
                          className="highlight-image"
                          style={
                            item.image_url
                              ? {
                                  backgroundImage: `url(${item.image_url})`,
                                }
                              : undefined
                          }
                        >
                          {!item.image_url && (
                            <Sparkles size={20} />
                          )}
                        </span>

                        <strong>
                          {item.title}
                        </strong>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="profile-section profile-posts">
                  <div className="section-heading profile-content-heading">
                    <div>
                      <p className="eyebrow">
                        {viewAs ? "PUBLIC PROFILE" : "YOUR ACTIVITY"}
                      </p>

                      <h3>{profileSection === "posts" ? "Posts" : "Reposts"}</h3>
                    </div>

                    {!viewAs && (
                      <div className="profile-content-tabs" role="tablist" aria-label="Profile content">
                        <button
                          className={profileSection === "posts" ? "profile-content-tab active" : "profile-content-tab"}
                          type="button"
                          role="tab"
                          aria-selected={profileSection === "posts"}
                          onClick={() => setProfileSection("posts")}
                        >
                          Posts <span>{profilePosts.length}</span>
                        </button>
                        <button
                          className={profileSection === "reposts" ? "profile-content-tab active" : "profile-content-tab"}
                          type="button"
                          role="tab"
                          aria-selected={profileSection === "reposts"}
                          onClick={() => setProfileSection("reposts")}
                        >
                          Reposts <span>{profileReposts.length}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {profileSection === "posts" ? (
                    profilePosts.length === 0 ? (
                    <div className="empty-state glass">
                      <Image size={22} />

                      <strong>
                        No posts yet.
                      </strong>

                      <span>
                        Your published posts will
                        appear here.
                      </span>

                      {!viewAs && (
                        <button
                          className="primary-button"
                          type="button"
                          onClick={() =>
                            setComposerOpen(true)
                          }
                        >
                          Create a post
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="feed-list">
                      {profilePosts.map(
                        (post) => (
                          <article
                            id={`post-${post.id}`}
                            className="post-card glass"
                            key={post.id}
                          >
                            <div className="post-head">
                              <div
                                className="avatar"
                                style={
                                  profile.avatar_url
                                    ? {
                                        backgroundImage: `url(${profile.avatar_url})`,
                                      }
                                    : undefined
                                }
                              >
                                {!profile.avatar_url &&
                                  initials(
                                    profile.display_name,
                                  )}
                              </div>

                              <div>
                                {!viewAs && (
                                  <button
                                    className="post-more-button"
                                    type="button"
                                    aria-label="Post options"
                                    title="Post options"
                                    onClick={() => setPostActionTarget(post)}
                                  >
                                    <MoreVertical size={18} />
                                  </button>
                                )}
                                <strong>
                                  {
                                    profile.display_name
                                  }
                                </strong>

                                <span className="post-meta">
                                  @
                                  {
                                    profile.username
                                  }{" "}
                                  ·{" "}
                                  <button
                                    className="timestamp-button"
                                    type="button"
                                    onClick={() =>
                                      setOpenTimestamp(
                                        openTimestamp === post.id ? null : post.id,
                                      )
                                    }
                                    title="Show exact date and time"
                                  >
                                    <Clock size={11} />
                                    {timeAgo(post.created_at)}
                                  </button>
                                </span>
                                {openTimestamp === post.id && (
                                  <div className="timestamp-popover">
                                    <strong>Posted</strong>
                                    <span>{exactTime(post.created_at)}</span>
                                    {post.liked && post.liked_at && (
                                      <>
                                        <strong>Liked by you</strong>
                                        <span>{exactTime(post.liked_at)}</span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {renderExpandablePostContent(post.content, post.id)}
                            {renderPostMedia(post.media_url, post.media_type)}

                            {post.pinned_at && (
                              <div className="post-status-label"><Pin size={12} /> Pinned</div>
                            )}
                            {post.tagged_profiles?.length ? (
                              <div className="post-tag-label"><Tag size={12} /> {post.tagged_profiles.map((item) => `@${item.username}`).join(", ")}</div>
                            ) : null}
                            <div className="post-actions">
                              {!post.shared_post_id && post.author_id === session?.user.id && (
                                <button className="post-action" type="button" onClick={() => openEditPost(post)} aria-label="Edit post">
                                  <Pencil size={17} />
                                  Edit
                                </button>
                              )}
                              <button
                                className={
                                  post.liked
                                    ? "post-action liked"
                                    : "post-action"
                                }
                                type="button"
                                onClick={() =>
                                  void toggleLike(
                                    post,
                                  )
                                }
                              >
                                <Heart
                                  size={17}
                                  fill={
                                    post.liked
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                                {post.likes}
                              </button>

                              <span className="post-action">
                                <MessageCircle
                                  size={17}
                                />
                                {post.comments}
                              </span>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  )
                ) : (
                    profileReposts.length === 0 ? (
                      <div className="empty-state glass">
                        <Repeat2 size={22} />
                        <strong>No reposts yet.</strong>
                        <span>Posts you repost will appear here.</span>
                      </div>
                    ) : (
                      <div className="feed-list">
                        {profileReposts.map((post) => (
                          <article id={`post-${post.id}`} className="post-card glass" key={post.id}>
                            <div className="repost-label">
                              <Repeat2 size={13} />
                              <span>You reposted this</span>
                              {post.reposted_at && <time dateTime={post.reposted_at}>{timeAgo(post.reposted_at)}</time>}
                            </div>

                            <div className="post-head">
                              <div
                                className="avatar"
                                style={post.profile?.avatar_url ? { backgroundImage: "url(" + post.profile.avatar_url + ")" } : undefined}
                              >
                                {!post.profile?.avatar_url && initials(post.profile?.display_name ?? "R")}
                              </div>
                              <div>
                                <strong>{post.profile?.display_name ?? "RP WORLD member"}{post.profile?.username === "zaevii" && <span className="verified-badge" aria-label="Verified">✓</span>}</strong>
                                <span className="post-meta">
                                  @{post.profile?.username ?? "member"} ·{" "}
                                  <button
                                    className="timestamp-button"
                                    type="button"
                                    onClick={() => setOpenTimestamp(openTimestamp === "repost-" + post.id ? null : "repost-" + post.id)}
                                    title="Show exact date and time"
                                  >
                                    <Clock size={11} />
                                    {timeAgo(post.created_at)}
                                  </button>
                                </span>
                                {openTimestamp === "repost-" + post.id && (
                                  <div className="timestamp-popover">
                                    <strong>Originally posted</strong>
                                    <span>{exactTime(post.created_at)}</span>
                                    {post.reposted_at && (
                                      <>
                                        <strong>Reposted by you</strong>
                                        <span>{exactTime(post.reposted_at)}</span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {renderExpandablePostContent(post.content, post.id)}

                            {renderPostMedia(post.media_url, post.media_type)}

                            <div className="post-actions">
                              <button
                                className={post.liked ? "post-action liked" : "post-action"}
                                type="button"
                                onClick={() => void toggleLike(post)}
                              >
                                <Heart size={17} fill={post.liked ? "currentColor" : "none"} />
                                {post.likes}
                              </button>
                              <span className="post-action">
                                <MessageCircle size={17} />
                                {post.comments}
                              </span>
                              <span className="post-action">
                                <Repeat2 size={17} />
                                Reposted
                              </span>
                            </div>
                          </article>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {view === "public" && publicProfile && (
              <section className="profile-page public-profile-page">
                <div className="profile-hero glass">
                  <div className="profile-cover" style={publicProfile.cover_url ? { backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.42)),url(${publicProfile.cover_url})` } : undefined} />
                  <div className="profile-main">
                    <div className="profile-avatar-wrap"><div className="profile-avatar avatar" style={publicProfile.avatar_url ? { backgroundImage: `url(${publicProfile.avatar_url})` } : undefined}>{!publicProfile.avatar_url && initials(publicProfile.display_name)}</div></div>
                    <div className="profile-identity">
                      <div className="profile-name-row"><div><h2>{publicProfile.display_name}{publicProfile.username === "zaevii" && <span className="verified-badge" aria-label="Verified">✓</span>}</h2><span>@{publicProfile.username}</span></div></div>
                      <p className="profile-bio">{publicProfile.bio || "No bio yet. Tell the world who you are."}</p>
                      <div className="profile-actions profile-social-actions">
                        <button className="profile-action-button follow-button" type="button" onClick={() => void toggleFollowPublicProfile()}><UserPlus size={14} />{followingPublicProfile ? "Following" : "Follow"}</button>
                        <button
                          className="profile-action-button"
                          type="button"
                          onClick={() => {
                            if (publicProfileFriend) {
                              void openMessageConversation();
                            } else {
                              setMessageNoticeOpen(true);
                            }
                          }}
                          aria-label="Message"
                          title={publicProfileFriend ? "Message" : "Follow each other to unlock messages"}
                        >
                          <MessageCircle size={14} />
                          Message
                        </button>
                        
                      </div>
                      <div className="profile-meta">
                        <span><Sparkles size={13} />{publicProfile.rp_id}</span>
                        <span><User size={13} />{profileStats.followers} {profileStats.followers === 1 ? "follower" : "followers"}</span>
                        <span><Heart size={13} />{profileStats.likes} {profileStats.likes === 1 ? "like" : "likes"}</span>
                        <span><MapPin size={13} />RP WORLD</span>
                        {publicProfileFriend && <span><User size={13} />Friends</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="profile-section">
                  <div className="section-heading"><div><p className="eyebrow">HIGHLIGHTS</p><h3>Moments</h3></div></div>
                  <div className="highlights-row view-as">
                    {publicHighlights.length === 0 ? <span className="comments-empty">No highlights yet.</span> : publicHighlights.map((item) => (
                      <button className={publicProfile.highlight_style === "portrait" ? "highlight-card highlight-card-portrait" : "highlight-card highlight-card-circle"} key={item.id} type="button" onClick={() => setActiveHighlight(item)}>
                        <span className="highlight-image" style={item.image_url ? { backgroundImage: `url(${item.image_url})` } : undefined}>{!item.image_url && <Sparkles size={20} />}</span><strong>{item.title}</strong>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="profile-section profile-posts">
                  <div className="section-heading"><div><p className="eyebrow">PUBLIC PROFILE</p><h3>Posts</h3></div></div>
                  {publicProfilePosts.length === 0 ? <div className="empty-state glass"><Image size={22} /><strong>No posts yet.</strong><span>This user's published posts will appear here.</span></div> : (
                    <div className="feed-list">{publicProfilePosts.map((post) => (
                      <article className="post-card glass" key={post.id}>
                        <div className="post-head"><div className="avatar" style={post.profile?.avatar_url ? { backgroundImage: `url(${post.profile.avatar_url})` } : undefined}>{!post.profile?.avatar_url && initials(post.profile?.display_name ?? "RP")}</div><div><strong>{post.profile?.display_name}{post.profile?.username === "zaevii" && <span className="verified-badge" aria-label="Verified">✓</span>}</strong><span className="post-meta">@{post.profile?.username} · {timeAgo(post.created_at)}</span></div></div>
                        {renderExpandablePostContent(post.content, post.id)}
                        <div className="post-actions">
                          <button className={post.liked ? "post-action liked" : "post-action"} type="button" onClick={() => void toggleLike(post)}><Heart size={17} fill={post.liked ? "currentColor" : "none"} />{post.likes}</button>
                          <button className="post-action" type="button" onClick={() => void toggleComments(post.id)}><MessageCircle size={17} />{post.comments || "Reply"}</button>
                          <button className={post.reposted ? "post-action reposted" : "post-action"} type="button" onClick={() => void repostPost(post)} disabled={repostBusy === post.id}><Repeat2 size={17} />{post.reposts || 0}</button>
                          <button className="post-action" type="button" onClick={() => void sharePost(post)} aria-label="Share" title="Share"><Share2 size={17} />{post.shares || 0}</button>
                           <button className={savedPostIds.has(post.id) ? "post-action active" : "post-action"} type="button" onClick={() => toggleSavedPost(post)} aria-label={savedPostIds.has(post.id) ? "Saved" : "Save"} title={savedPostIds.has(post.id) ? "Saved" : "Save"}><Bookmark size={17} fill={savedPostIds.has(post.id) ? "currentColor" : "none"} /></button>
                        </div>
                      </article>
                    ))}</div>
                  )}
                </div>
              </section>
            )}

            {view === "menu" && (
              <div className="menu-card glass">
                <button
                  type="button"
                  onClick={() =>
                    setProfileOpen(true)
                  }
                >
                  <User size={18} />
                  Edit profile
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setView("discover")
                  }
                >
                  <Search size={18} />
                  Discover
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleLogout()
                  }
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              </div>
            )}
          </section>
        </main>
      )}

      {session && profile && (
        <nav
          className="bottom-nav glass"
          aria-label="Primary navigation"
        >
          <button
            className={
              view === "home"
                ? "nav-item active"
                : "nav-item"
            }
            type="button"
            onClick={() => setView("home")}
          >
            <Home size={19} />
            <span>Home</span>
          </button>

          <button
            className={
              view === "discover"
                ? "nav-item active"
                : "nav-item"
            }
            type="button"
            onClick={() =>
              setView("discover")
            }
          >
            <Search size={19} />
            <span>Discover</span>
          </button>

          <button
            className="nav-create"
            type="button"
            aria-label="Create post"
            onClick={() =>
              setComposerOpen(true)
            }
          >
            <Plus size={22} />
          </button>

          <button
            className={
              view === "profile"
                ? "nav-item active"
                : "nav-item"
            }
            type="button"
            onClick={() =>
              setView("profile")
            }
          >
            <User size={19} />
            <span>Profile</span>
          </button>

          <button
            className={
              view === "menu"
                ? "nav-item active"
                : "nav-item"
            }
            type="button"
            onClick={openMenu}
          >
            <Menu size={19} />
            <span>Menu</span>
          </button>
        </nav>
      )}

      {messageNoticeOpen && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setMessageNoticeOpen(false)}>
          <section className="message-notice glass" role="dialog" aria-modal="true" aria-labelledby="message-notice-title" onClick={(event) => event.stopPropagation()}>
            <div className="message-notice-icon">
              <MessageCircle size={22} />
            </div>
            <h3 id="message-notice-title">Messaging is locked</h3>
            <p>You need to follow each other before you can start a conversation.</p>
            <button className="primary-button" type="button" onClick={() => setMessageNoticeOpen(false)}>Got it</button>
          </section>
        </div>
      )}

      {activeConversation && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setActiveConversation(null)}>
          <section className="message-sheet glass" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header"><div><p className="eyebrow">FRIENDS</p><h2>Messages</h2></div><button className="icon-button" type="button" aria-label="Close messages" onClick={() => setActiveConversation(null)}><X size={18} /></button></div>
            <div className="message-list">
              {(messagesByConversation[activeConversation] ?? []).map((item) => (
                <div className={item.sender_id === session?.user.id ? "message-bubble mine" : "message-bubble"} key={item.id}><span>{item.content}</span><small>{timeAgo(item.created_at)}</small></div>
              ))}
            </div>
            <form className="message-form" onSubmit={sendMessage}><input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Write a message…" maxLength={2000} autoFocus /><button type="submit" disabled={!messageDraft.trim()}>Send</button></form>
          </section>
        </div>
      )}

      {shareOpen && shareTarget && session && profile && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setShareOpen(false)}>
          <section className="auth-sheet glass share-sheet" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header"><div><p className="eyebrow">SHARE</p><h2 id="share-title">Share this post.</h2></div><button className="icon-button" type="button" aria-label="Close" onClick={() => setShareOpen(false)}><X size={18} /></button></div>
            <div className="share-preview">
              <div className="share-preview-author">
                <div className="avatar small-avatar" style={shareTarget.profile?.avatar_url ? { backgroundImage: `url(${shareTarget.profile.avatar_url})` } : undefined}>{!shareTarget.profile?.avatar_url && initials(shareTarget.profile?.display_name ?? "RP")}</div>
                <div><strong>{shareTarget.profile?.display_name ?? "RP WORLD member"}</strong><span>@{shareTarget.profile?.username ?? "member"}</span></div>
              </div>
              <p>{shareTarget.shared_original?.content ?? shareTarget.content}</p>
              {renderPostMedia(shareTarget.shared_original?.media_url ?? shareTarget.media_url, shareTarget.shared_original?.media_type ?? shareTarget.media_type)}
            </div>
            <label className="share-caption-field">
              <span>Add a caption <small>optional</small></span>
              <div className="input-wrap textarea-wrap"><textarea value={shareCaption} onChange={(event) => setShareCaption(event.target.value)} placeholder="Say something about this post…" maxLength={2000} rows={4} /></div>
            </label>
            <div className="share-sheet-actions">
              <button className="mode-switch" type="button" onClick={() => void sharePostExternally(shareTarget)}>Share outside RP WORLD</button>
              <button className="primary-button full" type="button" disabled={shareBusy} onClick={() => void sharePostToFeed()}>{shareBusy ? "Sharing…" : "Share to RP WORLD"}</button>
            </div>
          </section>
        </div>
      )}

      {editPostOpen && editPostTarget && session && profile && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setEditPostOpen(false)}>
          <section className="auth-sheet glass edit-post-sheet" role="dialog" aria-modal="true" aria-labelledby="edit-post-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <div><p className="eyebrow">EDIT POST</p><h2 id="edit-post-title">Update your post.</h2></div>
              <button className="icon-button" type="button" aria-label="Close" onClick={() => setEditPostOpen(false)}><X size={18} /></button>
            </div>
            <p className="sheet-copy">Edit your text and save when you're ready. Your post date and engagement stay unchanged.</p>
            <form className="auth-form" onSubmit={saveEditedPost}>
              <div className="input-wrap textarea-wrap"><textarea value={editPostText} onChange={(event) => setEditPostText(event.target.value)} placeholder="Edit your post…" maxLength={2000} rows={7} autoFocus /></div>

              {editPostTarget.media_url && !editPostMediaRemove && (
                <div className="post-media-selected current">
                  <span>Current {editPostTarget.media_type?.startsWith("video/") ? "video" : "photo"}</span>
                  <button type="button" className="post-media-remove" onClick={() => setEditPostMediaRemove(true)} aria-label="Remove current media"><X size={14} /></button>
                </div>
              )}

              {editPostMediaRemove && (
                <div className="post-media-selected">
                  <span>Media will be removed</span>
                  <button type="button" className="post-media-remove" onClick={() => setEditPostMediaRemove(false)} aria-label="Keep current media"><X size={14} /></button>
                </div>
              )}

              <label className="post-media-picker">
                <span className="post-media-picker-label"><Image size={16} /> {editPostTarget.media_url ? "Replace photo/video" : "Add photo or video"}</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) {
                      const mediaError = validatePostMedia(file);
                      if (mediaError) {
                        setFeedError(mediaError);
                        event.currentTarget.value = "";
                        return;
                      }
                    }
                    setFeedError("");
                    setEditPostMediaFile(file);
                    if (file) setEditPostMediaRemove(false);
                  }}
                />
              </label>

              {editPostMediaFile && (
                <div className="post-media-selected">
                  <span>New {editPostMediaFile.type.startsWith("video/") ? "video" : "photo"} · {editPostMediaFile.name}</span>
                  <button type="button" className="post-media-remove" onClick={() => setEditPostMediaFile(null)} aria-label="Remove selected media"><X size={14} /></button>
                </div>
              )}

              <div className="composer-footer"><span>{editPostText.length}/2000</span><button className="primary-button" type="submit" disabled={editPostBusy || (!editPostText.trim() && !editPostMediaFile && (!editPostTarget.media_url || editPostMediaRemove))}>{editPostBusy ? "Saving…" : "Save changes"}</button></div>
            </form>
          </section>
        </div>
      )}

      {postActionTarget && session && profile && (
        <div className="sheet-backdrop" role="presentation" onClick={() => !postActionBusy && setPostActionTarget(null)}>
          <section className="post-action-sheet glass" role="dialog" aria-modal="true" aria-labelledby="post-action-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <div><p className="eyebrow">POST OPTIONS</p><h2 id="post-action-title">Manage this post.</h2></div>
              <button className="icon-button" type="button" aria-label="Close" onClick={() => setPostActionTarget(null)} disabled={postActionBusy}><X size={18} /></button>
            </div>
            <div className="post-action-menu">
              <button type="button" onClick={() => void managePostAction("pin")} disabled={postActionBusy}>
                <Pin size={18} /><span>{postActionTarget.pinned_at ? "Unpin post" : "Pin post"}</span>
              </button>
              <button type="button" onClick={() => void openTagPost(postActionTarget)}>
                <Tag size={18} /><span>Tag</span>
              </button>
              <button type="button" onClick={() => { const target = postActionTarget; setPostActionTarget(null); openEditPost(target); }}>
                <Pencil size={18} /><span>Edit post</span>
              </button>
              <button type="button" onClick={() => void managePostAction("archive")} disabled={postActionBusy}>
                <Archive size={18} /><span>Move to archive</span>
              </button>
              <button className="post-action-destructive" type="button" onClick={() => void managePostAction("trash")} disabled={postActionBusy}>
                <Trash2 size={18} /><span>Move to trash</span><small>Deleted after 30 days</small>
              </button>
              <button type="button" onClick={() => void managePostAction("copy")} disabled={postActionBusy}>
                <Link2 size={18} /><span>Copy link</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {tagPostTarget && session && profile && (
        <div className="sheet-backdrop" role="presentation" onClick={() => !tagBusy && setTagPostTarget(null)}>
          <section className="auth-sheet glass tag-post-sheet" role="dialog" aria-modal="true" aria-labelledby="tag-post-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <div><p className="eyebrow">POST TAGS</p><h2 id="tag-post-title">Tag people.</h2></div>
              <button className="icon-button" type="button" aria-label="Close" onClick={() => setTagPostTarget(null)} disabled={tagBusy}><X size={18} /></button>
            </div>
            <div className="input-wrap">
              <Search size={15} />
              <input value={tagSearch} onChange={(event) => setTagSearch(event.target.value)} placeholder="Search people…" autoFocus />
            </div>
            <div className="tag-people-list">
              {tagProfiles
                .filter((person) => {
                  const query = tagSearch.trim().toLowerCase();
                  return !query || person.display_name.toLowerCase().includes(query) || person.username.toLowerCase().includes(query);
                })
                .slice(0, 30)
                .map((person) => (
                  <button className={taggedUserIds.has(person.id) ? "tag-person active" : "tag-person"} type="button" key={person.id} onClick={() => toggleTagUser(person.id)}>
                    <span className="avatar small-avatar" style={person.avatar_url ? { backgroundImage: `url(${person.avatar_url})` } : undefined}>{!person.avatar_url && initials(person.display_name)}</span>
                    <span><strong>{person.display_name}</strong><small>@{person.username}</small></span>
                    {taggedUserIds.has(person.id) && <span className="tag-check">✓</span>}
                  </button>
                ))}
            </div>
            <div className="composer-footer"><span>{taggedUserIds.size} selected</span><button className="primary-button" type="button" onClick={() => void savePostTags()} disabled={tagBusy}>{tagBusy ? "Saving…" : "Save tags"}</button></div>
          </section>
        </div>
      )}


      {composerOpen && (
        <div
          className="sheet-backdrop"
          role="presentation"
          onClick={() =>
            setComposerOpen(false)
          }
        >
          <section
            className="auth-sheet glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="composer-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="sheet-header">
              <div>
                <p className="eyebrow">CREATE</p>
                <h2 id="composer-title">
                  Drop a post.
                </h2>
              </div>

              <button
                className="icon-button"
                type="button"
                aria-label="Close"
                onClick={() =>
                  setComposerOpen(false)
                }
              >
                <X size={18} />
              </button>
            </div>

            <p className="sheet-copy">
              Share a thought, scene, update,
              character moment, or anything your
              RP world wants to say.
            </p>

            <form
              className="auth-form"
              onSubmit={createPost}
            >
              <div className="input-wrap textarea-wrap">
                <textarea
                  value={postText}
                  onChange={(event) => setPostText(event.target.value)}
                  placeholder="What's happening in your world?"
                  maxLength={2000}
                  rows={7}
                  autoFocus
                />
              </div>

              <label className="post-media-picker">
                <span className="post-media-picker-label"><Image size={16} /> Add photo or video</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) {
                      const mediaError = validatePostMedia(file);
                      if (mediaError) {
                        setFeedError(mediaError);
                        event.currentTarget.value = "";
                        return;
                      }
                    }
                    setFeedError("");
                    setPostMediaFile(file);
                  }}
                />
              </label>

              {postMediaFile && (
                <div className="post-media-selected">
                  <span>{postMediaFile.type.startsWith("video/") ? "Video" : "Photo"} · {postMediaFile.name}</span>
                  <button type="button" className="post-media-remove" onClick={() => setPostMediaFile(null)} aria-label="Remove selected media"><X size={14} /></button>
                </div>
              )}

              <div className="composer-footer">
                <span>
                  {postText.length}/2000
                </span>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={
                    postBusy ||
                    (!postText.trim() && !postMediaFile)
                  }
                >
                  {postBusy
                    ? "Publishing…"
                    : "Publish post"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {authOpen && (
        <div
          className="sheet-backdrop"
          role="presentation"
          onClick={() => setAuthOpen(false)}
        >
          <section
            className="auth-sheet glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="sheet-header">
              <div>
                <p className="eyebrow">
                  RP WORLD ACCESS
                </p>

                <h2 id="auth-title">
                  {authMode === "login"
                    ? "Welcome back."
                    : "Create your identity."}
                </h2>
              </div>

              <button
                className="icon-button"
                type="button"
                aria-label="Close"
                onClick={() =>
                  setAuthOpen(false)
                }
              >
                <X size={18} />
              </button>
            </div>

            <p className="sheet-copy">
              {authMode === "login"
                ? "Sign in to continue to RP WORLD."
                : "Start with your email and a secure password. Your email stays private."}
            </p>

            {!supabaseConfigured ? (
              <div className="setup-notice">
                <strong>
                  Supabase is not connected yet.
                </strong>

                <span>
                  Add the browser-safe Supabase
                  environment variables.
                </span>
              </div>
            ) : (
              <>
              <form
                className="auth-form"
                onSubmit={handleAuth}
              >
                <label>
                  <span>Email</span>

                  <div className="input-wrap">
                    <Mail size={16} />

                    <input
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value,
                        )
                      }
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </label>

                <label>
                  <span>Password</span>

                  <div className="input-wrap password-input-wrap">
                    <input
                      type={passwordVisible ? "text" : "password"}
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value,
                        )
                      }
                      placeholder="At least 6 characters"
                      autoComplete={
                        authMode === "login"
                          ? "current-password"
                          : "new-password"
                      }
                      minLength={6}
                      required
                    />
                    <button
                      className="password-toggle"
                      type="button"
                      aria-label={
                        passwordVisible
                          ? "Hide password"
                          : "Show password"
                      }
                      aria-pressed={passwordVisible}
                      onClick={() =>
                        setPasswordVisible((visible) => !visible)
                      }
                    >
                      {passwordVisible ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </label>

                {error && (
                  <p className="form-message error">
                    {error}
                  </p>
                )}

                {message && (
                  <p className="form-message success">
                    {message}
                  </p>
                )}

                <button
                  className="primary-button full"
                  type="submit"
                  disabled={busy}
                >
                  {busy
                    ? "Please wait…"
                    : authMode === "login"
                      ? "Sign in"
                      : "Create account"}
                </button>
              </form>
              </>
            )}

            <button
              className="mode-switch"
              type="button"
              onClick={() => {
                setAuthMode(
                  authMode === "login"
                    ? "signup"
                    : "login",
                );
                resetAuthMessages();
              }}
            >
              {authMode === "login"
                ? "New to RP WORLD? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </section>
        </div>
      )}

      {highlightOpen && session && profile && (
        <div
          className="sheet-backdrop"
          role="presentation"
          onClick={() =>
            setHighlightOpen(false)
          }
        >
          <section
            className="auth-sheet glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="highlight-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="sheet-header">
              <div>
                <p className="eyebrow">
                  PROFILE HIGHLIGHT
                </p>

                <h2 id="highlight-title">
                  Add a moment.
                </h2>
              </div>

              <button
                className="icon-button"
                type="button"
                aria-label="Close"
                onClick={() =>
                  setHighlightOpen(false)
                }
              >
                <X size={18} />
              </button>
            </div>

            <p className="sheet-copy">
              Create a highlight for your profile.
              Choose a photo from your device and
              give the moment a short title.
            </p>

            <form
              className="auth-form"
              onSubmit={createHighlight}
            >
              <label>
                <span>Title</span>

                <div className="input-wrap">
                  <input
                    value={highlightTitle}
                    onChange={(event) =>
                      setHighlightTitle(
                        event.target.value,
                      )
                    }
                    maxLength={24}
                    placeholder="Scenes, Events, OCs…"
                    required
                  />
                </div>
              </label>

              <label>
                <span>
                  Photo{" "}
                  <small>optional</small>
                </span>

                <div className="input-wrap">
                  <Image size={15} />

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) =>
                      setHighlightFile(
                        event.target.files?.[0] ?? null,
                      )
                    }
                  />
                </div>
              </label>

              {profileError && (
                <p className="form-message error">
                  {profileError}
                </p>
              )}

              <button
                className="primary-button full"
                type="submit"
                disabled={highlightBusy}
              >
                {highlightBusy
                  ? "Saving…"
                  : "Add highlight"}
              </button>
            </form>
          </section>
        </div>
      )}

      {activePostMedia && (
        <div
          className="post-media-viewer"
          role="presentation"
          onClick={() => setActivePostMedia(null)}
        >
          <section
            className="post-media-viewer-card"
            role="dialog"
            aria-modal="true"
            aria-label={activePostMedia.type === "video" ? "Video viewer" : "Image viewer"}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="post-media-viewer-close"
              type="button"
              aria-label="Close media"
              onClick={() => setActivePostMedia(null)}
            >
              <X size={20} />
            </button>
            <div className="post-media-viewer-content">
              {activePostMedia.type === "video" ? (
                <video
                  src={activePostMedia.url}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img src={activePostMedia.url} alt="Post media" />
              )}
            </div>
          </section>
        </div>
      )}

      {activeHighlight && (
        <div
          className="highlight-viewer"
          role="presentation"
          onClick={() => setActiveHighlight(null)}
        >
          <section
            className="highlight-viewer-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="active-highlight-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="highlight-viewer-close"
              type="button"
              aria-label="Close highlight"
              onClick={() => setActiveHighlight(null)}
            >
              <X size={20} />
            </button>

            <div
              className="highlight-viewer-image"
              style={
                activeHighlight.image_url
                  ? {
                      backgroundImage: `url(${activeHighlight.image_url})`,
                    }
                  : undefined
              }
            >
              {!activeHighlight.image_url && <Sparkles size={38} />}
            </div>

            <div className="highlight-viewer-caption">
              <strong id="active-highlight-title">
                {activeHighlight.title}
              </strong>
              <span>RP WORLD highlight</span>
            </div>
          </section>
        </div>
      )}

      {profileOpen && session && (
        <div
          className="sheet-backdrop"
          role="presentation"
        >
          <section
            className="profile-sheet glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
          >
            <div className="sheet-header">
              <div>
                <p className="eyebrow">
                  RP WORLD IDENTITY
                </p>

                <h2 id="profile-title">
                  Build your profile.
                </h2>
              </div>

              {profile && (
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Close"
                  onClick={() =>
                    setProfileOpen(false)
                  }
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <p className="sheet-copy">
              Choose the identity people will see
              inside RP WORLD. Your email stays
              private and is not your public
              username.
            </p>

            <form
              className="auth-form"
              onSubmit={handleProfileSubmit}
            >
              <label>
                <span>Username</span>

                <div className="input-wrap">
                  <span className="input-prefix">
                    @
                  </span>

                  <input
                    type="text"
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value
                          .replace(
                            /[^a-zA-Z0-9_]/g,
                            "",
                          )
                          .toLowerCase(),
                      )
                    }
                    placeholder="yourname"
                    maxLength={24}
                    required
                  />
                </div>
              </label>

              <label>
                <span>Display name</span>

                <div className="input-wrap">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(event) =>
                      setDisplayName(
                        event.target.value,
                      )
                    }
                    placeholder="Your RP name"
                    maxLength={60}
                    required
                  />
                </div>
              </label>

              <label>
                <span>
                  Profile photo{" "}
                  <small>optional</small>
                </span>

                <div className="input-wrap">
                  <Camera size={15} />

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) =>
                      setAvatarFile(
                        event.target.files?.[0] ?? null,
                      )
                    }
                  />
                </div>
              </label>

              <label>
                <span>
                  Cover photo{" "}
                  <small>optional</small>
                </span>

                <div className="input-wrap">
                  <Image size={15} />

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) =>
                      setCoverFile(
                        event.target.files?.[0] ?? null,
                      )
                    }
                  />
                </div>
              </label>

              <div className="highlight-style-field">
                <div className="highlight-style-label">
                  <span>Highlight style</span>
                  <small>Choose how your highlights appear on your profile.</small>
                </div>
                <div className="highlight-style-options" role="radiogroup" aria-label="Highlight style">
                  <button className={highlightStyle === "circle" ? "highlight-style-option active" : "highlight-style-option"} type="button" role="radio" aria-checked={highlightStyle === "circle"} onClick={() => setHighlightStyle("circle")}>
                    <span className="style-preview style-preview-circle"><Sparkles size={15} /></span>
                    <span><strong>Circle</strong><small>Instagram-style</small></span>
                  </button>
                  <button className={highlightStyle === "portrait" ? "highlight-style-option active" : "highlight-style-option"} type="button" role="radio" aria-checked={highlightStyle === "portrait"} onClick={() => setHighlightStyle("portrait")}>
                    <span className="style-preview style-preview-portrait"><Sparkles size={15} /></span>
                    <span><strong>Portrait</strong><small>Facebook-style</small></span>
                  </button>
                </div>
              </div>

              <label>
                <span>
                  Bio{" "}
                  <small>optional</small>
                </span>

                <div className="input-wrap textarea-wrap">
                  <textarea
                    value={bio}
                    onChange={(event) =>
                      setBio(event.target.value)
                    }
                    placeholder="A short line about your RP identity."
                    maxLength={160}
                    rows={3}
                  />
                </div>
              </label>

              {profileError && (
                <p className="form-message error">
                  {profileError}
                </p>
              )}

              <button
                className="primary-button full"
                type="submit"
                disabled={profileBusy}
              >
                {profileBusy
                  ? "Saving…"
                  : profile
                    ? "Save changes"
                    : "Continue"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}