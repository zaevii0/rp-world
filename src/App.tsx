import {
  ArrowLeft,
  ArrowUp,
  Camera,
  ShieldCheck,
  Clock,
  Eye,
  EyeOff,
  Globe2,
  LockKeyhole,
  LayoutGrid,
  Users,
  UsersRound,
  UserRound,
  GraduationCap,
  Music,
  MessageCircle,
  ShoppingBag,
  PenLine,
  Gamepad2,
  Phone,
  BookOpen,
  Newspaper,
  TrendingUp,
  Sparkles,
  Trophy,
  Heart,
  Home,
  Image,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Share2,
  Repeat2,
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
  Send,
  Sun,
  User,
  UserPlus,
  X,
  CheckCheck,
  Settings,
  Mic,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import type { RealtimeChannel, Session } from "@supabase/supabase-js";
import { ThemePicker } from "./components/ThemePicker";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { themes, type Appearance, type ThemeId } from "./types/theme";
import type { Profile } from "./types/profile";
const Stories = lazy(() => import("./components/Stories").then((module) => ({ default: module.Stories })));
const SuggestionsPage = lazy(() => import("./components/SuggestionsPage").then((module) => ({ default: module.SuggestionsPage })));
const AdminPanelPage = lazy(() => import("./components/AdminPanelPage").then((module) => ({ default: module.AdminPanelPage })));

function RPWorldMark() {
  return (
    <svg className="rp-world-mark" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="48" stroke="currentColor" strokeWidth="8" />
      <path d="M64 22c-17 12-27 27-27 42s10 30 27 42c17-12 27-27 27-42S81 34 64 22Z" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" />
      <path d="M22 56c12-6 27-9 42-9s30 3 42 9M22 72c12 6 27 9 42 9s30-3 42-9" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M49 48h30L49 80h30" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const THEME_KEY = "rpw-theme";
const APPEARANCE_KEY = "rpw-appearance";
const VIEW_KEY = "rpw-current-view";
const PUBLIC_PROFILE_KEY = "rpw-current-public-profile";
const MESSAGE_CONVERSATION_KEY = "rpw-active-message-conversation";

type AppView = "home" | "search" | "discover" | "profile" | "public" | "menu" | "suggestions" | "admin" | "support";
type VerifiedPlan = "verified_2w" | "verified_1m" | "verified_3m_themes";

function readStoredView(): AppView {
  try {
    const saved = sessionStorage.getItem(VIEW_KEY);
    return saved === "home" || saved === "search" || saved === "discover" || saved === "profile" || saved === "public" || saved === "menu" || saved === "suggestions" || saved === "admin" || saved === "support"
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
  privacy?: "public" | "friends" | "only_me";
  share_caption?: string | null;
  shared_original?: {
    content: string;
    media_url: string | null;
    media_type?: string | null;
    created_at: string;
    profile?: Profile;
    privacy?: "public" | "friends" | "only_me";
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
  media_url: string | null;
  media_type: string | null;
  updated_at?: string;
  edited_at?: string | null;
  is_deleted?: boolean;
  is_hidden?: boolean;
  is_pinned?: boolean;
  profile?: Profile;
  reactionCount: number;
  reactionType: string | null;
  reactionCounts?: Record<string, number>;
};

type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";
type MessageReaction = {
  message_id?: string;
  user_id: string;
  reaction_type: string;
};
type ChatMessage = {
  id: string;
  client_id?: string | null;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  edited_at?: string | null;
  unsent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  reply_to_id?: string | null;
  character_id?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  reactions?: MessageReaction[];
  status?: MessageStatus;
  optimistic?: boolean;
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

function isAdminProfile(profile?: Profile | null, adminIds: Set<string> = new Set()) {
  return Boolean(profile?.id && adminIds.has(profile.id));
}

function isVerifiedProfile(profile?: Profile | null) {
  return Boolean(profile?.verified_until && new Date(profile.verified_until).getTime() > Date.now());
}

function hasPremiumThemes(profile?: Profile | null) {
  return Boolean(profile?.themes_until && new Date(profile.themes_until).getTime() > Date.now());
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "R";
}

function getElegantGreeting(name: string) {
  const hour = new Date().getHours();
  let pool: string[];

  if (hour >= 5 && hour < 12) {
    pool = [
      `A pleasant morning, ${name}.`,
      `A lovely morning, ${name}.`,
      `A fine morning, ${name}.`,
    ];
  } else if (hour >= 12 && hour < 18) {
    pool = [
      `A pleasant afternoon, ${name}.`,
      `A lovely afternoon, ${name}.`,
      `A fine afternoon, ${name}.`,
    ];
  } else {
    pool = [
      `A pleasant evening, ${name}.`,
      `A lovely evening, ${name}.`,
      `A fine evening, ${name}.`,
      `A peaceful evening, ${name}.`,
    ];
  }

  const key = "rpw:lastElegantGreeting";
  let last = "";

  try {
    last = sessionStorage.getItem(key) || "";
  } catch {
    // Ignore unavailable session storage.
  }

  const choices = pool.filter((greeting) => greeting !== last);
  const greeting =
    choices[Math.floor(Math.random() * choices.length)] || pool[0];

  try {
    sessionStorage.setItem(key, greeting);
  } catch {
    // Ignore unavailable session storage.
  }

  return greeting;
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

function isVideoMedia(value: string | null | undefined) {
  if (!value) return false;
  return /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(value);
}

export function App() {
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  const [appearance, setAppearance] =
    useState<Appearance>(readAppearance);

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());

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
  const [highlightEditOpen, setHighlightEditOpen] = useState(false);
  const [highlightEditTitle, setHighlightEditTitle] = useState("");
  const [highlightEditFile, setHighlightEditFile] = useState<File | null>(null);
  const [highlightEditBusy, setHighlightEditBusy] = useState(false);
  const [highlightActionsOpen, setHighlightActionsOpen] = useState(false);
  const highlightAddFileRef = useRef<HTMLInputElement | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [activePostMedia, setActivePostMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [signedMediaUrls, setSignedMediaUrls] = useState<Record<string, string>>({});
  const [highlightStyle, setHighlightStyle] = useState<HighlightStyle>("circle");

  const [view, setView] = useState<AppView>(readStoredView);

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] =
    useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(() => {
    try {
      return localStorage.getItem("rpw-stay-signed-in") !== "false";
    } catch {
      return true;
    }
  });

  const [profileOpen, setProfileOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [supportPlan, setSupportPlan] = useState<VerifiedPlan>("verified_2w");
  const [supportBusy, setSupportBusy] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportCheckoutUrl, setSupportCheckoutUrl] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [postText, setPostText] = useState("");
  const [postPrivacy, setPostPrivacy] = useState<"public" | "friends" | "only_me">("public");
  const [sharePrivacy, setSharePrivacy] = useState<"public" | "friends" | "only_me">("public");
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
  const [postActionTarget, setPostActionTarget] = useState<Post | null>(null);
  const [tagPostTarget, setTagPostTarget] = useState<Post | null>(null);
  const [tagProfiles, setTagProfiles] = useState<Profile[]>([]);
  const [taggedUserIds, setTaggedUserIds] = useState<Set<string>>(new Set());
  const [tagSearch, setTagSearch] = useState("");
  const [tagBusy, setTagBusy] = useState(false);
  const [postActionBusy, setPostActionBusy] = useState(false);
  const [privacyBusy, setPrivacyBusy] = useState(false);

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
  const [commentActionTarget, setCommentActionTarget] = useState<Comment | null>(null);
  const [commentActionPostId, setCommentActionPostId] = useState<string | null>(null);
  const [commentEditId, setCommentEditId] = useState<string | null>(null);
  const [commentEditDraft, setCommentEditDraft] = useState("");
  const [commentActionBusy, setCommentActionBusy] = useState<string | null>(null);
  const [commentReactionUsers, setCommentReactionUsers] = useState<Array<{ id: string; profile: Profile; reactionType: string }>>([]);
  const [commentReactionUsersOpen, setCommentReactionUsersOpen] = useState(false);
  const [commentReactionUsersBusy, setCommentReactionUsersBusy] = useState(false);
  const [commentMediaFiles, setCommentMediaFiles] = useState<Record<string, File | null>>({});
  const [openTimestamp, setOpenTimestamp] = useState<string | null>(null);
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<string>>(new Set());
  const [commentMentionQuery, setCommentMentionQuery] = useState<Record<string, string | null>>({});
  const [commentMentionStart, setCommentMentionStart] = useState<Record<string, number | null>>({});
  const [viewAs, setViewAs] = useState(false);
  const [publicProfile, setPublicProfile] = useState<Profile | null>(null);
  const [publicProfilePosts, setPublicProfilePosts] = useState<Post[]>([]);
  const [publicHighlights, setPublicHighlights] = useState<Highlight[]>([]);
  const [followingPublicProfile, setFollowingPublicProfile] = useState(false);
  const [followedByPublicProfile, setFollowedByPublicProfile] = useState(false);
  const [publicProfileFriend, setPublicProfileFriend] = useState(false);
  const [friendActionsOpen, setFriendActionsOpen] = useState(false);
  const [friendActionBusy, setFriendActionBusy] = useState(false);
  const [discoverProfiles, setDiscoverProfiles] = useState<Profile[]>([]);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [openDiscoverCategory, setOpenDiscoverCategory] = useState("");
  const [activeConversation, setActiveConversation] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(MESSAGE_CONVERSATION_KEY);
    } catch {
      return null;
    }
  });
  const [messageInboxOpen, setMessageInboxOpen] = useState(false);
  const [messageConversations, setMessageConversations] = useState<Array<{
    id: string;
    otherProfile: Profile;
    lastMessage: string;
    lastMessageAt: string;
  }>>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ChatMessage[]>>({});
  const [messageDraft, setMessageDraft] = useState("");
  const [messageNoticeOpen, setMessageNoticeOpen] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [activeConversationProfile, setActiveConversationProfile] = useState<Profile | null>(null);
  const [expandedMessageTimestamps, setExpandedMessageTimestamps] = useState<Record<string, boolean>>({});
  const [messageSettingsOpen, setMessageSettingsOpen] = useState(false);
  const [chatNickname, setChatNickname] = useState("");
  const [messageReplyTarget, setMessageReplyTarget] = useState<ChatMessage | null>(null);
  const [messageEditTarget, setMessageEditTarget] = useState<ChatMessage | null>(null);
  const [messageEditDraft, setMessageEditDraft] = useState("");
  const [messageReactionTarget, setMessageReactionTarget] = useState<string | null>(null);
  const [messageActionTarget, setMessageActionTarget] = useState<ChatMessage | null>(null);
  const [messageTyping, setMessageTyping] = useState(false);
  const [messageTypingUsers, setMessageTypingUsers] = useState<Set<string>>(new Set());
  const [messageHasMore, setMessageHasMore] = useState<Record<string, boolean>>({});
  const [messageLoadingOlder, setMessageLoadingOlder] = useState(false);
  const [messageMediaFile, setMessageMediaFile] = useState<File | null>(null);
  const [messageVoiceRecording, setMessageVoiceRecording] = useState(false);
  const messageMediaRef = useRef<HTMLInputElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const messageTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageVoiceRecorderRef = useRef<MediaRecorder | null>(null);
  const messageVoiceChunksRef = useRef<Blob[]>([]);
  const messageLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenshotLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenshotLongPressTriggeredRef = useRef(false);
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [screenshotEditing, setScreenshotEditing] = useState(false);
  const [screenshotDrawing, setScreenshotDrawing] = useState(false);
  const [screenshotBusy, setScreenshotBusy] = useState(false);
  const screenshotCanvasRef = useRef<HTMLCanvasElement | null>(null);

  async function captureCurrentScreen() {
    if (screenshotBusy) return;
    setScreenshotBusy(true);
    try {
      const target = document.body;
      if (!target) throw new Error("App screen is unavailable.");

      // Capture exactly what is visible right now, regardless of the current
      // RP WORLD view or scroll position. Fixed navigation stays in the frame.
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      // Load the screenshot library only when this feature is actually used.
      // This keeps html2canvas out of the initial application bundle and avoids
      // making every RP WORLD visit pay the screenshot feature's startup cost.
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(target, {
        backgroundColor: null,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
        logging: false,
        x: scrollX,
        y: scrollY,
        width: viewportWidth,
        height: viewportHeight,
        windowWidth: viewportWidth,
        windowHeight: viewportHeight,
        scrollX,
        scrollY,
        ignoreElements: (element) => element.classList.contains("screenshot-editor"),
      });
      setScreenshotDataUrl(canvas.toDataURL("image/png"));
      setScreenshotOpen(true);
      setScreenshotEditing(false);
      setScreenshotDrawing(false);
    } catch (captureError) {
      console.error("RP WORLD screenshot capture failed", captureError);
      setMessage("Could not capture the screen. Please try again.");
    } finally {
      setScreenshotBusy(false);
    }
  }

  function startScreenshotLongPress() {
    screenshotLongPressTriggeredRef.current = false;
    if (screenshotLongPressRef.current) clearTimeout(screenshotLongPressRef.current);
    screenshotLongPressRef.current = setTimeout(() => {
      screenshotLongPressTriggeredRef.current = true;
      void captureCurrentScreen();
    }, 550);
  }

  function cancelScreenshotLongPress() {
    if (screenshotLongPressRef.current) {
      clearTimeout(screenshotLongPressRef.current);
      screenshotLongPressRef.current = null;
    }
  }

  function finishScreenshotPress(action: () => void) {
    const wasLongPress = screenshotLongPressTriggeredRef.current;
    cancelScreenshotLongPress();
    if (!wasLongPress) action();
    screenshotLongPressTriggeredRef.current = false;
  }

  function replaceScreenshotCanvas(canvas: HTMLCanvasElement) {
    setScreenshotDataUrl(canvas.toDataURL("image/png"));
  }

  function cropScreenshot(ratio: number | null) {
    if (!screenshotDataUrl) return;
    const image = new window.Image();
    image.onload = () => {
      const sourceRatio = image.width / image.height;
      let width = image.width;
      let height = image.height;
      if (ratio) {
        if (sourceRatio > ratio) width = Math.round(image.height * ratio);
        else height = Math.round(image.width / ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, Math.round((image.width - width) / 2), Math.round((image.height - height) / 2), width, height, 0, 0, width, height);
      replaceScreenshotCanvas(canvas);
    };
    image.src = screenshotDataUrl;
  }

  useEffect(() => {
    if (!screenshotDataUrl || !screenshotCanvasRef.current) return;
    const canvas = screenshotCanvasRef.current;
    const image = new window.Image();
    image.onload = () => {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (context) context.drawImage(image, 0, 0);
    };
    image.src = screenshotDataUrl;
  }, [screenshotDataUrl]);

  function drawOnScreenshot(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!screenshotDrawing) return;
    const canvas = screenshotCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8f8f98";
    context.lineWidth = 5 * Math.max(scaleX, scaleY);
    context.lineCap = "round";
    context.lineJoin = "round";
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    if (event.type === "pointerdown") {
      canvas.setPointerCapture(event.pointerId);
      context.beginPath();
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
      context.stroke();
    }
    replaceScreenshotCanvas(canvas);
  }

  async function saveScreenshot() {
    if (!screenshotDataUrl) return;
    const response = await fetch(screenshotDataUrl);
    const blob = await response.blob();
    const filename = `rp-world-screenshot-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
    try {
      if ("showSaveFilePicker" in window) {
        const picker = (window as Window & { showSaveFilePicker?: (options: unknown) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }> }).showSaveFilePicker;
        if (picker) {
          const handle = await picker({ suggestedName: filename, types: [{ description: "PNG image", accept: { "image/png": [".png"] } }] });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        }
      } else {
        const link = document.createElement("a");
        link.href = screenshotDataUrl;
        link.download = filename;
        link.click();
      }
      setScreenshotOpen(false);
    } catch (saveError) {
      console.error("RP WORLD screenshot save failed", saveError);
      setMessage("Screenshot was not saved.");
    }
  }

  function chatNicknameKey(otherUserId: string) {
    return `rpw-chat-nickname-${session?.user.id ?? "anonymous"}-${otherUserId}`;
  }

  function getChatDisplayName(otherProfile: Profile | null) {
    if (!otherProfile) return "Messages";
    try {
      return localStorage.getItem(chatNicknameKey(otherProfile.id))?.trim() || otherProfile.display_name;
    } catch {
      return otherProfile.display_name;
    }
  }

  function openMessageSettings() {
    if (!activeConversationProfile) return;
    try {
      setChatNickname(localStorage.getItem(chatNicknameKey(activeConversationProfile.id)) ?? "");
    } catch {
      setChatNickname("");
    }
    setMessageSettingsOpen(true);
  }

  function saveMessageSettings(event: FormEvent) {
    event.preventDefault();
    if (!activeConversationProfile) return;
    const nickname = chatNickname.trim().slice(0, 40);
    try {
      if (nickname) localStorage.setItem(chatNicknameKey(activeConversationProfile.id), nickname);
      else localStorage.removeItem(chatNicknameKey(activeConversationProfile.id));
    } catch {
      // Ignore unavailable local storage.
    }
    setMessageSettingsOpen(false);
  }
  const [profileStats, setProfileStats] = useState({ followers: 0, likes: 0 });
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followersBusy, setFollowersBusy] = useState(false);
  const [followers, setFollowers] = useState<Array<{ id: string; profile: Profile; followedAt: string; followingBack: boolean }>>([]);
  const [hiddenFollowerIds, setHiddenFollowerIds] = useState<Set<string>>(new Set());
  const [followersOwnerName, setFollowersOwnerName] = useState("");

  const commentReactionOptions = [
    { type: "like", emoji: "👍", label: "Like" },
    { type: "love", emoji: "❤️", label: "Love" },
    { type: "care", emoji: "🥰", label: "Care" },
    { type: "haha", emoji: "😂", label: "Haha" },
    { type: "wow", emoji: "😮", label: "Wow" },
    { type: "sad", emoji: "😢", label: "Sad" },
    { type: "angry", emoji: "😡", label: "Angry" },
  ];


  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(APPEARANCE_KEY, appearance);
    document.documentElement.dataset.appearance = appearance;
  }, [appearance]);

  useEffect(() => {
    if (!profile || hasPremiumThemes(profile)) return;
    if (theme !== "midnight" && theme !== "ocean") {
      setTheme("midnight");
    }
  }, [profile, theme]);


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
  }, [view, publicProfile, session?.user?.id]);

  useEffect(() => {
    if (!supabase || !session?.user) {
      setOnlineUserIds(new Set());
      return;
    }

    const presenceChannel = supabase.channel("rp-world-presence", {
      config: { presence: { key: session.user.id } },
    });

    const syncPresence = () => {
      const state = presenceChannel.presenceState();
      setOnlineUserIds(new Set(Object.keys(state)));
    };

    presenceChannel.on("presence", { event: "sync" }, syncPresence);
    presenceChannel.on("presence", { event: "join" }, syncPresence);
    presenceChannel.on("presence", { event: "leave" }, syncPresence);

    void presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      void presenceChannel.untrack();
      if (supabase) void supabase.removeChannel(presenceChannel);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        let shouldStaySignedIn = true;
        try {
          shouldStaySignedIn = localStorage.getItem("rpw-stay-signed-in") !== "false";
        } catch {
          // Default to keeping the Supabase session when storage is unavailable.
        }

        if (data.session && !shouldStaySignedIn) {
          await supabase.auth.signOut();
          setSession(null);
          return;
        }

        setSession(data.session);
      });

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
    let active = true;

    async function checkAdmin() {
      if (!supabase || !session?.user) {
        if (active) setIsAdmin(false);
        return;
      }

      const { data, error: adminError } = await supabase.rpc("is_admin");
      const allowed = !adminError && data === true;
      if (active) {
        setIsAdmin(allowed);
        if (!allowed && view === "admin") setView("menu");
      }
    }
    async function loadAdminIds() {
      if (!supabase || !session?.user) {
        if (active) setAdminUserIds(new Set());
        return;
      }
      const { data, error } = await supabase.rpc("get_admin_user_ids");
      const ids = !error && Array.isArray(data) ? new Set(data as string[]) : new Set<string>();

      // Always keep the currently authenticated admin in the local badge set.
      // This also makes the owner's own posts show the badge immediately even
      // if the admin-ID listing migration/function has not reached the database yet.
      const { data: currentAdmin } = await supabase.rpc("is_admin");
      if (currentAdmin === true) ids.add(session.user.id);

      if (active) setAdminUserIds(ids);
    }

    void checkAdmin();
    void loadAdminIds();
    return () => {
      active = false;
    };
  }, [session]);

  // Feed loading only depends on authentication. Do not wait for the profile
  // query: both can load in parallel so the feed can reach first paint sooner.
  useEffect(() => {
    if (session?.user) {
      void loadFeed();
    } else {
      setPosts([]);
    }
  }, [session]);

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
  }, [tagPostTarget, session?.user?.id]);

  useEffect(() => {
    if (view === "search" && session?.user && profile) {
      void loadDiscoverProfiles();
    }
  }, [view, session?.user?.id, profile]);

  useEffect(() => {
    if (view === "profile" && session?.user && profile) {
      void loadProfilePosts();
      void loadProfileReposts();
      void loadHighlights();
      void loadProfileStats(session.user.id);
    }
  }, [view, session, profile]);

  useEffect(() => {
    if (!supabase || !session?.user || !activeConversation) return;

    const conversationId = activeConversation;
    let active = true;

    const refreshMessages = async () => {
      if (!active) return;
      await loadConversationMessages(conversationId);
    };

    const messageChannel = supabase
      .channel(`rp-world-messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as ChatMessage;

          if (incoming.conversation_id !== conversationId) return;

          setMessagesByConversation((current) => {
            const existing = current[conversationId] ?? [];
            if (existing.some((item) => item.id === incoming.id)) return current;

            return {
              ...current,
              [conversationId]: [...existing, {
                ...incoming,
                conversation_id: conversationId,
                reactions: incoming.reactions ?? [],
                status: incoming.status ?? "sent",
              }],
            };
          });

          void loadMessageInbox();
        },
      );

    void messageChannel.subscribe();

    // Realtime is the primary path. A lightweight fallback refresh also
    // keeps the conversation current if the realtime connection is delayed.
    const fallbackRefresh = window.setInterval(() => {
      void refreshMessages();
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(fallbackRefresh);
      void supabase.removeChannel(messageChannel);
    };
  }, [session, activeConversation]);

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

  async function loadFeed() {
    if (!supabase || !session?.user) return;

    setFeedError("");

    // Load the actual feed rows first. The UI can render as soon as the
    // authors are resolved; secondary data is hydrated in the background.
    const { data, error: loadError } = await supabase
      .from("posts")
      .select(
        "id, author_id, content, media_url, media_type, created_at, pinned_at, archived_at, trashed_at, privacy, shared_post_id, share_caption, post_likes(count), post_comments(count)",
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

    const postIds = rows.map((row) => row.id);
    const authorIds = [...new Set(rows.map((row) => row.author_id))];
    const sharedPostIds = [...new Set(
      rows.map((row) => row.shared_post_id).filter(Boolean),
    )] as string[];

    // Author profiles are the only dependency for the first paint.
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("*").in("id", authorIds)
      : { data: [] as Profile[] };

    const profileMap = new Map(
      (profiles ?? []).map((item) => [item.id, item as Profile]),
    );

    // Render the feed immediately with the data already available.
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
        liked: false,
        liked_at: null as string | null,
        comments: row.post_comments?.[0]?.count ?? 0,
        reposts: 0,
        reposted: false,
        reposted_at: null as string | null,
        shares: 0,
        pinned_at: row.pinned_at ?? null,
        archived_at: row.archived_at ?? null,
        privacy: row.privacy ?? "public",
        trashed_at: null as string | null,
        tagged_profiles: [] as Profile[],
        shared_post_id: row.shared_post_id ?? null,
        share_caption: row.share_caption ?? null,
        shared_original: null as Post["shared_original"],
      })),
    );

    if (!postIds.length) return;

    // Everything below is secondary enrichment and can happen in parallel
    // without blocking the initial feed render.
    const [sharedRowsResult, shareRowsResult, myLikesResult, tagMap] =
      await Promise.all([
        sharedPostIds.length
          ? supabase
              .from("posts")
              .select("id, content, media_url, media_type, created_at, author_id")
              .in("id", sharedPostIds)
          : Promise.resolve({
              data: [] as Array<{
                id: string;
                content: string;
                media_url: string | null;
                media_type?: string | null;
                created_at: string;
                author_id: string;
              }>,
            }),
        supabase
          .from("posts")
          .select("shared_post_id")
          .in("shared_post_id", postIds),
        supabase
          .from("post_likes")
          .select("post_id, created_at")
          .eq("user_id", session.user.id)
          .in("post_id", postIds),
        loadPostTags(postIds),
      ]);

    const sharedRows = sharedRowsResult.data ?? [];
    const shareRows = shareRowsResult.data ?? [];
    const myLikes = myLikesResult.data ?? [];

    const sharedAuthorIds = [...new Set(sharedRows.map((row) => row.author_id))];
    const { data: sharedProfiles } = sharedAuthorIds.length
      ? await supabase.from("profiles").select("*").in("id", sharedAuthorIds)
      : { data: [] as Profile[] };

    const sharedProfileMap = new Map(
      (sharedProfiles ?? []).map((item) => [item.id, item as Profile]),
    );

    const sharedMap = new Map(
      sharedRows.map((row) => [
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

    const shareCounts = new Map<string, number>();
    shareRows.forEach((row) => {
      if (row.shared_post_id) {
        shareCounts.set(
          row.shared_post_id,
          (shareCounts.get(row.shared_post_id) ?? 0) + 1,
        );
      }
    });

    const likedSet = new Set(myLikes.map((item) => item.post_id));
    const likedAtMap = new Map(
      myLikes.map((item) => [item.post_id, item.created_at]),
    );

    // Hydrate the already-visible posts with likes, tags, shares and reposts.
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
        reposted_at: null as string | null,
        shares: shareCounts.get(row.id) ?? 0,
        pinned_at: row.pinned_at ?? null,
        archived_at: row.archived_at ?? null,
        privacy: row.privacy ?? "public",
        trashed_at: row.trashed_at ?? null,
        tagged_profiles: tagMap.get(row.id) ?? [],
        shared_post_id: row.shared_post_id ?? null,
        share_caption: row.share_caption ?? null,
        shared_original: row.shared_post_id
          ? sharedMap.get(row.shared_post_id) ?? null
          : null,
      })),
    );
    void signPostMediaUrls([
      ...rows.map((row) => row.media_url),
      ...rows.map((row) => row.shared_post_id ? sharedMap.get(row.shared_post_id)?.media_url : null),
    ]);
  }

  const isDark = appearance !== "light";

  const title = useMemo(() => {
    if (view === "search") return "Search RP WORLD";
    if (view === "discover") return "Discover";
    if (view === "profile") return "Your profile";
    if (view === "public") return publicProfile?.display_name ?? "Profile";
    if (view === "menu") return "RP WORLD";
    if (view === "suggestions") return "Suggestions";
    if (view === "support") return "Get verified";

    return profile
      ? getElegantGreeting(profile.display_name)
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
    const mediaPath = getPostMediaPath(mediaUrl);
    const signedUrl = mediaPath ? signedMediaUrls[mediaPath] : null;
    if (!signedUrl) return null;
    const isVideo = mediaType?.startsWith("video/") ?? false;
    return (
      <button
        className="post-media-button"
        type="button"
        onClick={() => setActivePostMedia({ url: signedUrl, type: isVideo ? "video" : "image" })}
        aria-label={isVideo ? "Open video" : "Open image"}
      >
        {isVideo ? (
          <video
            className="post-media post-video"
            src={signedUrl}
            controls
            playsInline
            preload="metadata"
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          <img className="post-media" src={signedUrl} alt="" loading="lazy" />
        )}
      </button>
    );
  }

  function validatePostMedia(file: File) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return "Please choose an image or video file.";
    }
    const maxBytes = file.type.startsWith("video/")
      ? 50 * 1024 * 1024      : 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return file.type.startsWith("video/")
        ? "Videos must be 50 MB or smaller."
        : "Images must be 10 MB or smaller.";
    }
    return null;
  }

  async function uploadCommentMedia(file: File, postId: string) {
    if (!supabase || !session?.user) throw new Error("You must be signed in to upload media.");
    if (!file.type.startsWith("image/")) throw new Error("Comments and replies support images only.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Comment images must be 10 MB or smaller.");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${session.user.id}/${postId}/comments/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("post-media").upload(filePath, file, {
      cacheControl: "3600", contentType: file.type, upsert: false,
    });
    if (error) throw error;
    return filePath;
  }

  function getPostMediaPath(value: string | null | undefined) {
    if (!value) return null;
    const marker = "/storage/v1/object/public/post-media/";
    const markerIndex = value.indexOf(marker);
    if (markerIndex >= 0) return decodeURIComponent(value.slice(markerIndex + marker.length));
    return value.includes("/") ? value : null;
  }

  async function signPostMediaUrls(values: Array<string | null | undefined>) {
    if (!supabase) return;
    const paths = [...new Set(values.map(getPostMediaPath).filter((value): value is string => Boolean(value)))];
    if (!paths.length) return;

    const { data, error } = await supabase.storage
      .from("post-media")
      .createSignedUrls(paths, 3600);

    if (error || !data) return;

    const nextUrls: Record<string, string> = {};
    data.forEach((item: { path: string; signedUrl: string }) => {
      if (item.signedUrl) {
        nextUrls[item.path] = item.signedUrl;
      }
    });

    setSignedMediaUrls((current) => ({ ...current, ...nextUrls }));
  }

  async function uploadPostMedia(file: File, postId: string) {
    if (!supabase || !session?.user) {
      throw new Error("You must be signed in to upload media.");
    }
    const extension =
      file.name.split(".").pop()?.toLowerCase() ||
      (file.type.startsWith("video/") ? "mp4" : "jpg");
    const filePath = `${session.user.id}/${postId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("post-media")
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;
    return filePath;
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

    try {
      localStorage.setItem("rpw-stay-signed-in", String(staySignedIn));
    } catch {
      // Storage can be unavailable in privacy-restricted environments.
    }

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

  async function submitSupportIntent() {
    if (!supabase || !session?.user) return;

    const plans: Record<VerifiedPlan, { amount: number; label: string }> = {
      verified_2w: { amount: 50, label: "2 weeks" },
      verified_1m: { amount: 100, label: "1 month" },
      verified_3m_themes: { amount: 250, label: "3 months + all theme colors" },
    };
    const selected = plans[supportPlan];

    setSupportBusy(true);
    setSupportMessage("");
    setSupportCheckoutUrl(null);

    const { data: intent, error } = await supabase
      .from("support_intents")
      .insert({
        user_id: session.user.id,
        amount: selected.amount,
        currency: "PHP",
        frequency: "one_time",
        plan_code: supportPlan,
      })
      .select("id")
      .single();

    if (error || !intent) {
      setSupportBusy(false);
      setSupportMessage("We couldn't prepare your verified membership yet. Please try again.");
      return;
    }

    const { data: checkout, error: checkoutError } =
      await supabase.functions.invoke("create-support-payment", {
        body: { support_intent_id: intent.id },
      });

    setSupportBusy(false);

    if (checkoutError || !checkout?.checkout_url) {
      console.error("RP WORLD verified checkout creation failed", checkoutError);
      setSupportMessage("Your membership request was saved, but checkout could not be opened. Please try again.");
      return;
    }

    setSupportCheckoutUrl(checkout.checkout_url);
    setSupportMessage("Secure checkout is ready for ₱" + selected.amount + " · " + selected.label + ".");
    const opened = window.open(checkout.checkout_url, "_blank", "noopener,noreferrer");
    if (!opened) setSupportMessage("Your secure checkout is ready. Tap “Open secure checkout” below.");
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

  async function openFollowers(userId: string, ownerName: string) {
    if (!supabase || !session?.user) return;
    setFollowersOpen(true); setFollowersOwnerName(ownerName); setFollowersBusy(true); setHiddenFollowerIds(new Set());
    try {
      const { data: followRows, error: followError } = await supabase.from("user_follows").select("follower_id, created_at").eq("following_id", userId).order("created_at", { ascending: false });
      if (followError) throw followError;
      const rows = (followRows ?? []) as Array<{ follower_id: string; created_at: string }>;
      const followerIds = [...new Set(rows.map((row) => row.follower_id))];
      if (!followerIds.length) { setFollowers([]); return; }
      const [{ data: profileRows }, { data: myFollows }] = await Promise.all([
        supabase.from("profiles").select("*").in("id", followerIds),
        supabase.from("user_follows").select("following_id").eq("follower_id", session.user.id).in("following_id", followerIds),
      ]);
      const profileMap = new Map((profileRows ?? []).map((item) => [item.id, item as Profile]));
      const followingSet = new Set((myFollows ?? []).map((item) => item.following_id));
      setFollowers(rows.map((row) => { const followerProfile = profileMap.get(row.follower_id); if (!followerProfile) return null; return { id: row.follower_id, profile: followerProfile, followedAt: row.created_at, followingBack: followingSet.has(row.follower_id) }; }).filter((item): item is { id: string; profile: Profile; followedAt: string; followingBack: boolean } => Boolean(item)));
    } catch (error) { console.error("RP WORLD followers load failed", error); setFollowers([]); setMessage("Could not load followers. Please try again."); }
    finally { setFollowersBusy(false); }
  }

  async function followBackFollower(followerId: string) {
    if (!supabase || !session?.user || followerId === session.user.id) return;
    const { error: followError } = await supabase.from("user_follows").insert({ follower_id: session.user.id, following_id: followerId });
    if (followError && followError.code !== "23505") { setMessage("Could not follow this user. Please try again."); return; }
    setFollowers((current) => current.map((item) => item.id === followerId ? { ...item, followingBack: true } : item));
  }

  async function loadProfilePosts() {
    if (!supabase || !session?.user) return;

    const { data, error: loadError } = await supabase
      .from("posts")
      .select(
        "id, author_id, content, media_url, media_type, created_at, pinned_at, archived_at, trashed_at, privacy, post_likes(count), post_comments(count)",
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
    void signPostMediaUrls(rows.map((row) => row.media_url));
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
        "id, author_id, content, media_url, media_type, created_at, pinned_at, archived_at, trashed_at, privacy, post_likes(count), post_comments(count)",
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
    void signPostMediaUrls(rows.map((row) => row.media_url));

  }

  async function loadPublicProfile(userId: string) {
    if (!supabase || !session?.user || userId === session.user.id) {
      setView("profile");
      setViewAs(false);
      return;
    }

    // Switch views immediately so navigation never waits for the full profile payload.
    setView("public");
    setViewAs(false);
    setPublicProfilePosts([]);
    setPublicHighlights([]);
    setFollowingPublicProfile(false);
    setFollowedByPublicProfile(false);
    setPublicProfileFriend(false);

    try {
      sessionStorage.setItem(PUBLIC_PROFILE_KEY, userId);
    } catch {
      // Ignore unavailable session storage.
    }

    const [{ data: target }, { data: targetPosts }, { data: targetHighlights }, { data: myFollow }, { data: reverseFollow }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase
          .from("posts")
          .select("id, author_id, content, media_url, media_type, created_at, pinned_at, archived_at, trashed_at, privacy, post_likes(count), post_comments(count)")
          .eq("author_id", userId)
          .is("archived_at", null)
          .is("trashed_at", null)
          .order("pinned_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("profile_highlights")
          .select("id, user_id, title, image_url, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
        supabase
          .from("user_follows")
          .select("follower_id")
          .eq("follower_id", session.user.id)
          .eq("following_id", userId)
          .maybeSingle(),
        supabase
          .from("user_follows")
          .select("follower_id")
          .eq("follower_id", userId)
          .eq("following_id", session.user.id)
          .maybeSingle(),
      ]);

    if (!target) return;

    const targetProfile = target as Profile;
    setPublicProfile(targetProfile);
    setPublicHighlights((targetHighlights ?? []) as Highlight[]);

    const rows = (targetPosts ?? []) as Array<Post & {
      post_likes?: { count: number }[];
      post_comments?: { count: number }[];
    }>;
    const postIds = rows.map((row) => row.id);

    const [{ data: myLikes }, tagMap] = await Promise.all([
      postIds.length
        ? supabase
            .from("post_likes")
            .select("post_id, created_at")
            .eq("user_id", session.user.id)
            .in("post_id", postIds)
            .then(({ data }) => ({ data: data ?? [] }))
        : Promise.resolve({ data: [] as { post_id: string; created_at: string }[] }),
      loadPostTags(postIds),
    ]);

    const likedSet = new Set((myLikes ?? []).map((item) => item.post_id));
    const likedAtMap = new Map((myLikes ?? []).map((item) => [item.post_id, item.created_at]));

    const profilePostRows = [...rows].sort((a, b) => {
      const aPinned = Boolean(a.pinned_at);
      const bPinned = Boolean(b.pinned_at);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      if (aPinned && bPinned) {
        return new Date(b.pinned_at ?? 0).getTime() - new Date(a.pinned_at ?? 0).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setPublicProfilePosts(profilePostRows.map((row) => ({
      id: row.id,
      author_id: row.author_id,
      content: row.content,
      media_url: row.media_url,
      media_type: row.media_type ?? null,
      created_at: row.created_at,
      profile: targetProfile,
      likes: row.post_likes?.[0]?.count ?? 0,
      liked: likedSet.has(row.id),
      liked_at: likedAtMap.get(row.id) ?? null,
      comments: row.post_comments?.[0]?.count ?? 0,
      reposts: 0,
      shares: 0,
      pinned_at: row.pinned_at ?? null,
      archived_at: row.archived_at ?? null,
      trashed_at: row.trashed_at ?? null,
      privacy: row.privacy ?? "public",
      tagged_profiles: tagMap.get(row.id) ?? [],
      reposted: false,
    })));

    setFollowingPublicProfile(Boolean(myFollow));
    setFollowedByPublicProfile(Boolean(reverseFollow));
    setPublicProfileFriend(Boolean(myFollow && reverseFollow));

    void loadProfileStats(userId);
  }

  async function toggleFollowPublicProfile() {
    if (!supabase || !session?.user || !publicProfile) return;

    if (publicProfileFriend) {
      setFriendActionsOpen(true);
      return;
    }

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

  async function unfriendPublicProfile() {
    if (!supabase || !session?.user || !publicProfile || friendActionBusy) return;
    setFriendActionBusy(true);
    try {
      const { error } = await supabase.from("user_follows").delete()
        .eq("follower_id", session.user.id)
        .eq("following_id", publicProfile.id);
      if (error) throw error;
      setFollowingPublicProfile(false);
      setPublicProfileFriend(false);
      setFriendActionsOpen(false);
    } catch (error) {
      console.error("RP WORLD unfriend failed", error);
      setMessage("Could not unfriend this user. Please try again.");
    } finally {
      setFriendActionBusy(false);
    }
  }

  async function loadDiscoverProfiles() {
    if (!supabase || !session?.user) return;
    const { data } = await supabase.from("profiles").select("*").neq("id", session.user.id).order("display_name").limit(50);
    setDiscoverProfiles((data ?? []) as Profile[]);
  }

  function formatMessageTime(value: string) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function formatMessageDateTime(value: string) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(new Date(value));
  }

  function getActiveConversationProfile(conversationId: string) {
    return messageConversations.find((item) => item.id === conversationId)?.otherProfile
      ?? activeConversationProfile;
  }

  async function loadMessageInbox() {
    if (!supabase || !session?.user) return;
    const { data: conversations, error: conversationError } = await supabase
      .from("conversations")
      .select("id, user_low, user_high, created_at")
      .or(`user_low.eq.${session.user.id},user_high.eq.${session.user.id}`)
      .order("created_at", { ascending: false });
    if (conversationError || !conversations?.length) { setMessageConversations([]); return; }

    const conversationIds = conversations.map((item) => item.id);
    const otherIds = [...new Set(conversations.map((item) => item.user_low === session.user.id ? item.user_high : item.user_low))];
    const [{ data: otherProfiles }, { data: messageRows }] = await Promise.all([
      supabase.from("profiles").select("*").in("id", otherIds),
      supabase.from("messages").select("id, conversation_id, sender_id, content, created_at, unsent_at, media_type")
        .in("conversation_id", conversationIds).order("created_at", { ascending: false }),
    ]);
    const profileMap = new Map((otherProfiles ?? []).map((item) => [item.id, item as Profile]));
    const latestByConversation = new Map<string, { content: string; created_at: string; media_type?: string | null }>();
    for (const item of messageRows ?? []) {
      if (!latestByConversation.has(item.conversation_id)) latestByConversation.set(item.conversation_id, {
        content: item.unsent_at ? "Message unsent" : item.media_type ? "Attachment" : item.content,
        created_at: item.created_at,
        media_type: item.media_type,
      });
    }
    setMessageConversations(conversations.map((conversation) => {
      const otherId = conversation.user_low === session.user.id ? conversation.user_high : conversation.user_low;
      const otherProfile = profileMap.get(otherId);
      const latest = latestByConversation.get(conversation.id);
      return otherProfile ? {
        id: conversation.id, otherProfile,
        lastMessage: latest?.content ?? "No messages yet.",
        lastMessageAt: latest?.created_at ?? conversation.created_at,
      } : null;
    }).filter((item): item is NonNullable<typeof item> => Boolean(item)));
  }

  async function openMessageInbox() {
    setMessageInboxOpen(true);
    await loadMessageInbox();
  }

  async function openMessageConversation() {
    if (!supabase || !session?.user || !publicProfile || !publicProfileFriend) return;
    let low = session.user.id, high = publicProfile.id;
    if (low > high) [low, high] = [high, low];
    const { data, error: lookupError } = await supabase.from("conversations")
      .select("id, user_low, user_high").eq("user_low", low).eq("user_high", high).maybeSingle();
    if (lookupError) return;
    let conversation = data;
    if (!conversation) {
      const { data: created, error: createError } = await supabase.from("conversations")
        .insert({ user_low: low, user_high: high }).select("id, user_low, user_high").single();
      if (createError || !created) return;
      conversation = created;
    }
    setMessageInboxOpen(false);
    setActiveConversationProfile(publicProfile);
    setExpandedMessageTimestamps({});
    setActiveConversation(conversation.id);
    await loadConversationMessages(conversation.id);
  }

  async function openConversationById(conversationId: string) {
    setMessageInboxOpen(false);
    setActiveConversationProfile(getActiveConversationProfile(conversationId));
    setExpandedMessageTimestamps({});
    setActiveConversation(conversationId);
    await loadConversationMessages(conversationId);
  }

  const MESSAGE_PAGE_SIZE = 30;
  const messageSelect = "id, client_id, conversation_id, sender_id, content, created_at, updated_at, edited_at, unsent_at, delivered_at, read_at, reply_to_id, character_id, media_url, media_type";

  async function signMessageMediaUrls(rows: ChatMessage[]) {
    if (!supabase) return;
    const paths = [...new Set(rows.map((row) => row.media_url).filter((value): value is string => Boolean(value) && !value.startsWith("http")))];
    if (!paths.length) return;
    const { data } = await supabase.storage.from("message-media").createSignedUrls(paths, 3600);
    if (!data) return;
    const signed = Object.fromEntries(data.filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]));
    setMessagesByConversation((current) => {
      const list = current[activeConversation ?? ""] ?? [];
      return {
        ...current,
        [activeConversation ?? ""]: list.map((item) => signed[item.media_url ?? ""] ? { ...item, media_url: signed[item.media_url ?? ""] } : item),
      };
    });
  }

  async function loadConversationMessages(conversationId: string, before?: string) {
    if (!supabase || !session?.user) return;
    let query = supabase.from("messages").select(messageSelect).eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(MESSAGE_PAGE_SIZE);
    if (before) query = query.lt("created_at", before);
    const { data, error } = await query;
    if (error) { setMessage("Could not load messages. Please try again."); return; }
    const rows = ((data ?? []) as ChatMessage[]).reverse();
    const messageIds = rows.map((row) => row.id);
    const { data: reactionRows } = messageIds.length
      ? await supabase.from("message_reactions").select("message_id, user_id, reaction_type").in("message_id", messageIds)
      : { data: [] as MessageReaction[] };
    const reactionMap = new Map<string, MessageReaction[]>();
    for (const reaction of (reactionRows ?? []) as Array<MessageReaction & { message_id: string }>) {
      const list = reactionMap.get(reaction.message_id) ?? [];
      list.push({ user_id: reaction.user_id, reaction_type: reaction.reaction_type });
      reactionMap.set(reaction.message_id, list);
    }
    const hydrated = rows.map((row) => ({ ...row, reactions: reactionMap.get(row.id) ?? [], status: (row.read_at ? "read" : row.delivered_at ? "delivered" : row.sender_id === session.user.id ? "sent" : "delivered") as MessageStatus }));
    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: before ? [...hydrated, ...(current[conversationId] ?? [])] : hydrated,
    }));
    void signMessageMediaUrls(hydrated);
    setMessageHasMore((current) => ({ ...current, [conversationId]: rows.length === MESSAGE_PAGE_SIZE }));
    if (!before) {
      requestAnimationFrame(() => {
        const node = messageListRef.current;
        if (node) node.scrollTop = node.scrollHeight;
      });
    }
    const unread = rows.filter((item) => item.sender_id !== session.user.id && !item.read_at).map((item) => item.id);
    if (unread.length) {
      await supabase.from("messages").update({ read_at: new Date().toISOString(), delivered_at: new Date().toISOString() }).in("id", unread);
    }
  }

  async function loadOlderMessages() {
    if (!activeConversation || messageLoadingOlder || !messageHasMore[activeConversation]) return;
    const list = messageListRef.current;
    const first = messagesByConversation[activeConversation]?.[0];
    if (!list || !first) return;
    setMessageLoadingOlder(true);
    const previousHeight = list.scrollHeight;
    const previousTop = list.scrollTop;
    await loadConversationMessages(activeConversation, first.created_at);
    requestAnimationFrame(() => {
      if (messageListRef.current) messageListRef.current.scrollTop = previousTop + (messageListRef.current.scrollHeight - previousHeight);
    });
    setMessageLoadingOlder(false);
  }

  async function toggleMessageReaction(messageId: string, reactionType: string) {
    if (!supabase || !session?.user) return;
    const previous = messagesByConversation[activeConversation ?? ""] ?? [];
    const target = previous.find((item) => item.id === messageId);
    if (!target) return;
    const existing = target.reactions?.find((item) => item.user_id === session.user.id)?.reaction_type ?? null;
    const next = existing === reactionType ? null : reactionType;
    setMessagesByConversation((current) => ({
      ...current,
      [activeConversation ?? ""]: (current[activeConversation ?? ""] ?? []).map((item) => item.id === messageId
        ? { ...item, reactions: [...(item.reactions ?? []).filter((r) => r.user_id !== session.user.id), ...(next ? [{ user_id: session.user.id, reaction_type: next }] : [])] }
        : item),
    }));
    const result = next
      ? await supabase.from("message_reactions").upsert({ message_id: messageId, user_id: session.user.id, reaction_type: next })
      : await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", session.user.id);
    if (result.error) {
      setMessagesByConversation((current) => ({ ...current, [activeConversation ?? ""]: previous }));
      setMessage("Could not update reaction. Please try again.");
    }
  }

  async function saveEditedMessage() {
    if (!supabase || !session?.user || !messageEditTarget || !messageEditDraft.trim()) return;
    const target = messageEditTarget;
    const conversationId = activeConversation;
    if (!conversationId) return;
    const original = messagesByConversation[conversationId] ?? [];
    const optimistic = { ...target, content: messageEditDraft.trim(), edited_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setMessagesByConversation((current) => ({ ...current, [conversationId]: (current[conversationId] ?? []).map((item) => item.id === target.id ? optimistic : item) }));
    setMessageEditTarget(null);
    const { data, error } = await supabase.from("messages").update({ content: optimistic.content, edited_at: optimistic.edited_at }).eq("id", target.id).eq("sender_id", session.user.id).is("unsent_at", null).select(messageSelect).single();
    if (error || !data) {
      setMessagesByConversation((current) => ({ ...current, [conversationId]: original }));
      setMessage("Could not edit that message. Please try again.");
      return;
    }
    setMessagesByConversation((current) => ({ ...current, [conversationId]: (current[conversationId] ?? []).map((item) => item.id === target.id ? data as ChatMessage : item) }));
  }

  async function unsendMessage(target: ChatMessage) {
    if (!supabase || !session?.user || !activeConversation) return;
    const original = messagesByConversation[activeConversation] ?? [];
    setMessagesByConversation((current) => ({ ...current, [activeConversation]: (current[activeConversation] ?? []).map((item) => item.id === target.id ? { ...item, unsent_at: new Date().toISOString(), content: "", media_url: null, media_type: null } : item) }));
    const { data, error } = await supabase.from("messages").update({ unsent_at: new Date().toISOString(), content: "", media_url: null, media_type: null }).eq("id", target.id).eq("sender_id", session.user.id).is("unsent_at", null).select(messageSelect).single();
    if (error || !data) {
      setMessagesByConversation((current) => ({ ...current, [activeConversation]: original }));
      setMessage("Could not unsend that message. Please try again.");
      return;
    }
    setMessagesByConversation((current) => ({ ...current, [activeConversation]: (current[activeConversation] ?? []).map((item) => item.id === target.id ? data as ChatMessage : item) }));
    setMessageActionTarget(null);
  }

  function messageIsEditable(item: ChatMessage) {
    return item.sender_id === session?.user.id && !item.unsent_at && Date.now() - new Date(item.created_at).getTime() <= 15 * 60 * 1000;
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !session?.user || !activeConversation) return;
    const content = messageDraft.trim();
    if (!content && !messageMediaFile) return;
    const conversationId = activeConversation;
    const clientId = crypto.randomUUID();
    const now = new Date().toISOString();
    const optimistic: ChatMessage = {
      id: `local-${clientId}`, client_id: clientId, conversation_id: conversationId, sender_id: session.user.id,
      content, created_at: now, updated_at: now, reply_to_id: messageReplyTarget?.id ?? null,
      media_url: null, media_type: null, reactions: [], status: "sending", optimistic: true,
    };
    setMessagesByConversation((current) => ({ ...current, [conversationId]: [...(current[conversationId] ?? []), optimistic] }));
    setMessageDraft("");
    const replyId = messageReplyTarget?.id ?? null;
    setMessageReplyTarget(null);
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      if (messageMediaFile) {
        const file = messageMediaFile;
        if (file.size > 10 * 1024 * 1024) throw new Error("Message media must be 10 MB or smaller.");
        const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${session.user.id}/${conversationId}/${crypto.randomUUID()}.${extension}`;
        const upload = await supabase.storage.from("message-media").upload(path, file, { contentType: file.type, upsert: false });
        if (upload.error) throw upload.error;
        mediaUrl = path; mediaType = file.type;
      }
      setMessageMediaFile(null);
      const { data, error } = await supabase.from("messages").insert({
        conversation_id: conversationId, sender_id: session.user.id, client_id: clientId,
        content: content || (mediaType?.startsWith("audio/") ? "Voice message" : "Photo"),
        reply_to_id: replyId, media_url: mediaUrl, media_type: mediaType,
      }).select(messageSelect).single();
      if (error || !data) throw error ?? new Error("Message was not saved.");
      setMessagesByConversation((current) => ({ ...current, [conversationId]: (current[conversationId] ?? []).map((item) => item.id === optimistic.id ? { ...(data as ChatMessage), status: "sent" } : item) }));
      void loadMessageInbox();
    } catch (sendError) {
      setMessagesByConversation((current) => ({ ...current, [conversationId]: (current[conversationId] ?? []).map((item) => item.id === optimistic.id ? { ...item, status: "failed" } : item) }));
      setMessage(sendError instanceof Error ? sendError.message : "Could not send message.");
    }
  }

  function emitMessageTyping(value: string) {
    setMessageDraft(value);
    if (!messageChannelRef.current || !session?.user) return;
    void messageChannelRef.current.send({ type: "broadcast", event: "typing", payload: { userId: session.user.id, typing: true } });
    if (messageTypingTimerRef.current) clearTimeout(messageTypingTimerRef.current);
    messageTypingTimerRef.current = setTimeout(() => {
      void messageChannelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId: session.user.id, typing: false } });
    }, 1200);
  }

  async function toggleVoiceRecording() {
    if (!activeConversation) return;
    if (messageVoiceRecording) {
      messageVoiceRecorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Voice messages are not supported by this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      messageVoiceChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) messageVoiceChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setMessageVoiceRecording(false);
        const blob = new Blob(messageVoiceChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        setMessageMediaFile(file);
      };
      messageVoiceRecorderRef.current = recorder;
      recorder.start();
      setMessageVoiceRecording(true);
    } catch {
      setMessage("Microphone access was denied.");
    }
  }

  useEffect(() => {
    try {
      if (activeConversation) sessionStorage.setItem(MESSAGE_CONVERSATION_KEY, activeConversation);
      else sessionStorage.removeItem(MESSAGE_CONVERSATION_KEY);
    } catch {}
  }, [activeConversation]);

  useEffect(() => {
    if (!activeConversation || !session?.user || !supabase) return;
    let alive = true;
    const channel = supabase.channel(`messages:${activeConversation}`, { config: { broadcast: { self: false } } });
    messageChannelRef.current = channel;
    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversation}` }, (payload) => {
      const incoming = payload.new as ChatMessage;
      if (!alive) return;
      setMessagesByConversation((current) => {
        const list = current[activeConversation] ?? [];
        if (list.some((item) => item.id === incoming.id || (incoming.client_id && item.client_id === incoming.client_id))) {
          return { ...current, [activeConversation]: list.map((item) => item.client_id === incoming.client_id ? { ...incoming, status: "sent" } : item) };
        }
        return { ...current, [activeConversation]: [...list, { ...incoming, status: incoming.sender_id === session.user.id ? "sent" : "delivered" }] };
      });
      if (incoming.sender_id !== session.user.id) {
        void supabase.from("messages").update({ delivered_at: new Date().toISOString(), read_at: new Date().toISOString() }).eq("id", incoming.id);
      }
    }).on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversation}` }, (payload) => {
      const updated = payload.new as ChatMessage;
      setMessagesByConversation((current) => ({ ...current, [activeConversation]: (current[activeConversation] ?? []).map((item) => item.id === updated.id ? { ...item, ...updated, status: updated.read_at ? "read" : updated.delivered_at ? "delivered" : item.status } : item) }));
    }).on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversation}` }, (payload) => {
      const removed = payload.old as ChatMessage;
      setMessagesByConversation((current) => ({ ...current, [activeConversation]: (current[activeConversation] ?? []).filter((item) => item.id !== removed.id) }));
    }).on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" }, (payload) => {
      const reaction = payload.new as MessageReaction;
      setMessagesByConversation((current) => ({ ...current, [activeConversation]: (current[activeConversation] ?? []).map((item) => item.id === reaction.message_id ? { ...item, reactions: [...(item.reactions ?? []).filter((r) => r.user_id !== reaction.user_id), reaction] } : item) }));
    }).on("postgres_changes", { event: "UPDATE", schema: "public", table: "message_reactions" }, (payload) => {
      const reaction = payload.new as MessageReaction;
      setMessagesByConversation((current) => ({ ...current, [activeConversation]: (current[activeConversation] ?? []).map((item) => item.id === reaction.message_id ? { ...item, reactions: [...(item.reactions ?? []).filter((r) => r.user_id !== reaction.user_id), reaction] } : item) }));
    }).on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, (payload) => {
      const reaction = payload.old as MessageReaction;
      setMessagesByConversation((current) => ({ ...current, [activeConversation]: (current[activeConversation] ?? []).map((item) => item.id === reaction.message_id ? { ...item, reactions: (item.reactions ?? []).filter((r) => r.user_id !== reaction.user_id) } : item) }));
    }).on("broadcast", { event: "typing" }, ({ payload }) => {
      if (!payload?.userId || payload.userId === session.user.id) return;
      setMessageTypingUsers((current) => {
        const next = new Set(current);
        if (payload.typing) next.add(payload.userId); else next.delete(payload.userId);
        return next;
      });
    }).subscribe();
    return () => {
      alive = false;
      if (messageChannelRef.current === channel) messageChannelRef.current = null;
      void supabase.removeChannel(channel);
      setMessageTypingUsers(new Set());
    };
  }, [activeConversation, session?.user?.id]);

  useEffect(() => {
    const list = messageListRef.current;
    if (!list || !activeConversation) return;
    const onScroll = () => { if (list.scrollTop < 80) void loadOlderMessages(); };
    list.addEventListener("scroll", onScroll);
    return () => list.removeEventListener("scroll", onScroll);
  }, [activeConversation, messagesByConversation[activeConversation ?? ""]?.length]);

  useEffect(() => {
    if (!messageTyping) return;
    const timer = setTimeout(() => setMessageTyping(false), 1200);
    return () => clearTimeout(timer);
  }, [messageTyping]);

  async function loadHighlights() {
    if (!supabase || !session?.user) return;

    const { data } = await supabase
      .from("profile_highlights")
      .select("id, user_id, title, image_url, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true });

    setHighlights((data ?? []) as Highlight[]);
  }

  function openHighlightEditor(highlight: Highlight) {
    setHighlightActionsOpen(false);
    setHighlightEditTitle(highlight.title);
    setHighlightEditFile(null);
    setHighlightEditOpen(true);
  }

  async function addHighlightMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!supabase || !session?.user || !activeHighlight || !file || highlightEditBusy) return;
    setHighlightEditBusy(true);
    setProfileError("");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
      const filePath = session.user.id + "/highlights/" + activeHighlight.id + "/" + crypto.randomUUID() + "." + extension;
      const { error: uploadError } = await supabase.storage.from("profile-highlights").upload(filePath, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("profile-highlights").getPublicUrl(filePath);
      const { error: updateError } = await supabase.from("profile_highlights").update({ image_url: publicUrl.publicUrl }).eq("id", activeHighlight.id).eq("user_id", session.user.id);
      if (updateError) throw updateError;
      const nextHighlight = { ...activeHighlight, image_url: publicUrl.publicUrl };
      setActiveHighlight(nextHighlight);
      setHighlights((current) => current.map((item) => item.id === nextHighlight.id ? nextHighlight : item));
      setPublicHighlights((current) => current.map((item) => item.id === nextHighlight.id ? nextHighlight : item));
      setHighlightActionsOpen(false);
    } catch (caught) {
      setProfileError(caught instanceof Error ? caught.message : "Could not add the highlight photo.");
    } finally {
      setHighlightEditBusy(false);
    }
  }

  async function removeHighlightMedia() {
    if (!supabase || !session?.user || !activeHighlight || highlightEditBusy || !activeHighlight.image_url) return;
    if (!window.confirm("Remove the photo/video from this highlight?")) return;
    setHighlightEditBusy(true);
    setProfileError("");
    try {
      const { error: updateError } = await supabase.from("profile_highlights").update({ image_url: null }).eq("id", activeHighlight.id).eq("user_id", session.user.id);
      if (updateError) throw updateError;
      const nextHighlight: Highlight = { ...activeHighlight, image_url: null };
      setActiveHighlight(nextHighlight);
      setHighlights((current) => current.map((item) => item.id === nextHighlight.id ? nextHighlight : item));
      setPublicHighlights((current) => current.map((item) => item.id === nextHighlight.id ? nextHighlight : item));
      setHighlightActionsOpen(false);
    } catch (caught) {
      setProfileError(caught instanceof Error ? caught.message : "Could not remove the highlight photo.");
    } finally {
      setHighlightEditBusy(false);
    }
  }


  async function updateHighlight(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !session?.user || !activeHighlight) return;

    const title = highlightEditTitle.trim();
    if (!title) {
      setProfileError("Please enter a title for the highlight.");
      return;
    }

    setHighlightEditBusy(true);
    setProfileError("");

    try {
      let imageUrl = activeHighlight.image_url;

      if (highlightEditFile) {
        const extension = highlightEditFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-highlights")
          .upload(filePath, highlightEditFile, {
            cacheControl: "3600",
            contentType: highlightEditFile.type || "image/jpeg",
            upsert: false,
          });

        if (uploadError) throw new Error(`Media upload failed: ${uploadError.message}`);

        const { data: publicUrl } = supabase.storage
          .from("profile-highlights")
          .getPublicUrl(filePath);
        imageUrl = publicUrl.publicUrl;
      }

      const { data, error: updateError } = await supabase
        .from("profile_highlights")
        .update({ title, image_url: imageUrl })
        .eq("id", activeHighlight.id)
        .eq("user_id", session.user.id)
        .select("id, user_id, title, image_url, created_at")
        .single();

      if (updateError || !data) {
        throw new Error(updateError?.message || "Could not update highlight.");
      }

      const updated = data as Highlight;
      setHighlights((current) => current.map((item) => item.id === updated.id ? updated : item));
      setPublicHighlights((current) => current.map((item) => item.id === updated.id ? updated : item));
      setActiveHighlight(updated);
      setHighlightEditOpen(false);
      setHighlightEditFile(null);
    } catch (highlightError) {
      console.error("RP WORLD highlight update failed", highlightError);
      setProfileError(
        highlightError instanceof Error
          ? highlightError.message
          : "Could not update highlight. Please try again.",
      );
    } finally {
      setHighlightEditBusy(false);
    }
  }

  async function deleteHighlight() {
    if (!supabase || !session?.user || !activeHighlight || highlightEditBusy) return;

    const confirmed = window.confirm(`Delete the "${activeHighlight.title}" highlight? This cannot be undone.`);
    if (!confirmed) return;

    setHighlightEditBusy(true);
    setProfileError("");

    try {
      const imageUrl = activeHighlight.image_url;
      const marker = "/storage/v1/object/public/profile-highlights/";
      const markerIndex = imageUrl?.indexOf(marker) ?? -1;

      if (markerIndex >= 0) {
        const filePath = decodeURIComponent(imageUrl!.slice(markerIndex + marker.length));
        await supabase.storage.from("profile-highlights").remove([filePath]);
      }

      const { error: deleteError } = await supabase
        .from("profile_highlights")
        .delete()
        .eq("id", activeHighlight.id)
        .eq("user_id", session.user.id);

      if (deleteError) throw new Error(deleteError.message);

      setHighlights((current) => current.filter((item) => item.id !== activeHighlight.id));
      setPublicHighlights((current) => current.filter((item) => item.id !== activeHighlight.id));
      setActiveHighlight(null);
    } catch (highlightError) {
      console.error("RP WORLD highlight delete failed", highlightError);
      setProfileError(
        highlightError instanceof Error
          ? highlightError.message
          : "Could not delete highlight. Please try again.",
      );
    } finally {
      setHighlightEditBusy(false);
    }
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

    let createdPostId: string | null = null;
    let uploadedMediaPath: string | null = null;

    try {
      const postId = crypto.randomUUID();
      createdPostId = postId;

      // Create the post first so Storage RLS can verify that the uploader
      // owns the post represented by the second path segment.
      const { error: createError } = await supabase.from("posts").insert({
        id: postId,
        author_id: session.user.id,
        content: postText.trim(),
        media_url: null,
        media_type: null,
        privacy: postPrivacy,
      });

      if (createError) throw createError;

      if (postMediaFile) {
        uploadedMediaPath = await uploadPostMedia(postMediaFile, postId);

        const { error: mediaLinkError } = await supabase
          .from("posts")
          .update({
            media_url: uploadedMediaPath,
            media_type: postMediaFile.type,
          })
          .eq("id", postId)
          .eq("author_id", session.user.id);

        if (mediaLinkError) throw mediaLinkError;
      }

      setPostText("");
      setPostMediaFile(null);
      setPostPrivacy("public");
      setComposerOpen(false);
      await loadFeed();
      if (view === "profile") await loadProfilePosts();
    } catch (saveError) {
      if (uploadedMediaPath) {
        try {
          await supabase.storage
            .from("post-media")
            .remove([uploadedMediaPath]);
        } catch {
          // Best-effort cleanup only; preserve the original publish error.
        }
      }
      if (createdPostId) {
        try {
          await supabase
            .from("posts")
            .delete()
            .eq("id", createdPostId)
            .eq("author_id", session.user.id);
        } catch {
          // Best-effort cleanup only; preserve the original publish error.
        }
      }

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

    let uploadedEditMediaPath: string | null = null;

    try {
      let mediaUrl = editPostTarget.media_url;
      let mediaType = editPostTarget.media_type ?? (mediaUrl ? "image/*" : null);

      if (editPostMediaRemove) {
        mediaUrl = null;
        mediaType = null;
      } else if (editPostMediaFile) {
        mediaUrl = await uploadPostMedia(editPostMediaFile, editPostTarget.id);
        uploadedEditMediaPath = mediaUrl;
        mediaType = editPostMediaFile.type;
      }

      const { data, error: updateError } = await supabase
        .from("posts")
        .update({ content, media_url: mediaUrl, media_type: mediaType })
        .eq("id", editPostTarget.id)
        .eq("author_id", session.user.id)
        .select("id, content, media_url, media_type, privacy")
        .single();

      if (updateError || !data) {
        throw new Error(updateError?.message || "We could not update that post.");
      }

      const updatePost = (items: Post[]): Post[] =>
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
      if (uploadedEditMediaPath && supabase) {
        try {
          await supabase.storage.from("post-media").remove([uploadedEditMediaPath]);
        } catch {
          // Best-effort cleanup only; preserve the original edit error.
        }
      }
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
        "id, post_id, author_id, content, created_at, updated_at, edited_at, parent_id, media_url, media_type, is_deleted, is_hidden, is_pinned",
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
          parent_id: null as string | null,
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

    // Paint the actual comments immediately. Reactions and author profiles
    // are secondary enrichment and must not block the first visible render.
    setCommentsByPost((current) => ({
      ...current,
      [postId]: rows.map((row) => ({
        ...row,
        media_url: row.media_url ?? null,
        media_type: row.media_type ?? null,
        reactionCount: 0,
        reactionType: null as string | null,
        reactionCounts: {},
        profile: undefined as Profile | undefined,
      })),
    }));

    if (!rows.length) return;

    void signPostMediaUrls(rows.map((row) => row.media_url));

    const commentIds = rows.map((row) => row.id);
    const authorIds = [...new Set(rows.map((row) => row.author_id))];

    // These two queries are independent, so fetch them together.
    const [reactionsResult, profilesResult] = await Promise.all([
      supabase
        .from("comment_reactions")
        .select("comment_id, user_id, reaction_type")
        .in("comment_id", commentIds),
      authorIds.length
        ? supabase
            .from("profiles")
            .select("*")
            .in("id", authorIds)
        : Promise.resolve({ data: [] as Profile[] }),
    ]);

    const reactionRows = (reactionsResult.data ?? []) as {
      comment_id: string;
      user_id: string;
      reaction_type: string;
    }[];

    const reactionCounts = new Map<string, number>();
    const reactionBreakdown = new Map<string, Record<string, number>>();
    const reactionTypes = new Map<string, string>();

    reactionRows.forEach((reaction) => {
      reactionCounts.set(
        reaction.comment_id,
        (reactionCounts.get(reaction.comment_id) ?? 0) + 1,
      );
      const breakdown = reactionBreakdown.get(reaction.comment_id) ?? {};
      breakdown[reaction.reaction_type] = (breakdown[reaction.reaction_type] ?? 0) + 1;
      reactionBreakdown.set(reaction.comment_id, breakdown);
      if (reaction.user_id === session.user.id) {
        reactionTypes.set(reaction.comment_id, reaction.reaction_type);
      }
    });

    const profileMap = new Map(
      (profilesResult.data ?? []).map((item) => [
        item.id,
        item as Profile,
      ]),
    );

    // Enrich the already-visible comments without delaying their display.
    setCommentsByPost((current) => ({
      ...current,
      [postId]: rows.map((row) => ({
        ...row,
        media_url: row.media_url ?? null,
        media_type: row.media_type ?? null,
        reactionCount: reactionCounts.get(row.id) ?? 0,
        reactionType: reactionTypes.get(row.id) ?? null,
        reactionCounts: reactionBreakdown.get(row.id) ?? {},
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
    const mediaFile = commentMediaFiles[postId] ?? null;
    let mediaErrorMessage: string | null = null;

    if (!content && !mediaFile) return;

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

    if (!saveError && data && mediaFile) {
      try {
        const mediaPath = await uploadCommentMedia(mediaFile, postId);
        const { data: updatedComment, error: mediaError } = await supabase
          .from("post_comments")
          .update({ media_url: mediaPath, media_type: mediaFile.type })
          .eq("id", data.id)
          .eq("author_id", session.user.id)
          .select("id, post_id, author_id, content, created_at, parent_id, media_url, media_type")
          .single();
        if (mediaError || !updatedComment) throw mediaError ?? new Error("Could not attach image.");
        data = updatedComment as typeof data;
        void signPostMediaUrls([mediaPath]);
      } catch (mediaError) {
        await supabase.from("post_comments").delete().eq("id", data.id).eq("author_id", session.user.id);
        mediaErrorMessage = mediaError instanceof Error ? mediaError.message : "Could not attach the comment image.";
        data = null;
      }
    }

    setCommentBusy(null);

    if (saveError || !data) {
      console.error("RP WORLD comment could not be posted", saveError);
      setFeedError(
        mediaErrorMessage ||
          saveError?.message ||
          (parentId
            ? "This reply could not be posted. Please make sure the nested-reply database migration is applied."
            : "This comment could not be posted. Please try again."),
      );
      return;
    }

    const newComment = {
      ...(data as Comment),
      media_url: (data as Comment).media_url ?? null,
      media_type: (data as Comment).media_type ?? null,
      reactionCount: 0,
      reactionType: null as string | null,
      profile: profile ?? undefined,
    };

    setCommentsByPost((current) => ({
      ...current,
      [postId]: [
        ...(current[postId] ?? []),
        newComment,
      ],
    }));

    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    setCommentMediaFiles((current) => ({ ...current, [postId]: null }));
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

  async function manageComment(postId: string, comment: Comment, action: "edit" | "delete" | "pin" | "hide", content = "") {
    if (!supabase || !session?.user || comment.author_id !== session.user.id) return;
    setCommentActionBusy(comment.id);
    try {
      if (action === "edit") {
        const nextContent = content.trim();
        if (!nextContent && !comment.media_url) throw new Error("Comment cannot be empty.");
        const editedAt = new Date().toISOString();
        const { error } = await supabase.from("post_comments").update({ content: nextContent, edited_at: editedAt }).eq("id", comment.id).eq("author_id", session.user.id);
        if (error) throw error;
        setCommentsByPost((current) => ({ ...current, [postId]: (current[postId] ?? []).map((item) => item.id === comment.id ? { ...item, content: nextContent, edited_at: editedAt, updated_at: editedAt } : item) }));
        setCommentEditId(null);
      } else if (action === "delete") {
        // Comment/reply deletion is a true deletion: remove the database row
        // instead of leaving a visible "This comment was deleted" placeholder.
        // The RLS policy restricts DELETE to the comment author.
        const mediaPath = getPostMediaPath(comment.media_url);
        const { error } = await supabase
          .from("post_comments")
          .delete()
          .eq("id", comment.id)
          .eq("author_id", session.user.id);
        if (error) throw error;

        // Remove the author's attached comment image when possible. A storage
        // cleanup failure must not resurrect the deleted comment.
        if (mediaPath) {
          const { error: mediaError } = await supabase.storage
            .from("post-media")
            .remove([mediaPath]);
          if (mediaError) {
            console.warn("RP WORLD comment media cleanup failed", mediaError);
          }
        }

        setCommentsByPost((current) => ({
          ...current,
          [postId]: (current[postId] ?? []).filter((item) => item.id !== comment.id),
        }));
        setCommentEditId((current) => current === comment.id ? null : current);
      } else if (action === "pin") {
        if (comment.parent_id) throw new Error("Only top-level comments can be pinned.");
        const { error } = await supabase.from("post_comments").update({ is_pinned: !comment.is_pinned }).eq("id", comment.id);
        if (error) throw error;
        setCommentsByPost((current) => ({ ...current, [postId]: (current[postId] ?? []).map((item) => item.id === comment.id ? { ...item, is_pinned: !comment.is_pinned } : item) }));
      } else if (action === "hide") {
        const { error } = await supabase.from("post_comments").update({ is_hidden: !comment.is_hidden }).eq("id", comment.id);
        if (error) throw error;
        setCommentsByPost((current) => ({ ...current, [postId]: (current[postId] ?? []).map((item) => item.id === comment.id ? { ...item, is_hidden: !comment.is_hidden } : item) }));
      }
      setCommentActionTarget(null);
    } catch (error) {
      console.error("RP WORLD comment action failed", error);
      setFeedError(error instanceof Error ? error.message : "Could not update this comment.");
    } finally {
      setCommentActionBusy(null);
    }
  }

  async function showCommentReactionUsers(comment: Comment) {
    if (!supabase) return;
    setCommentReactionUsersOpen(true);
    setCommentReactionUsersBusy(true);
    try {
      const { data: reactions, error } = await supabase.from("comment_reactions").select("user_id, reaction_type").eq("comment_id", comment.id);
      if (error) throw error;
      const ids = [...new Set((reactions ?? []).map((item) => item.user_id))];
      let profiles: Profile[] = [];
      if (ids.length) {
        const { data, error: profileError } = await supabase.from("profiles").select("*").in("id", ids);
        if (profileError) throw profileError;
        profiles = (data ?? []) as Profile[];
      }
      const map = new Map(profiles.map((item) => [item.id, item as Profile]));
      setCommentReactionUsers((reactions ?? []).map((item) => ({ id: item.user_id, profile: map.get(item.user_id), reactionType: item.reaction_type })).filter((item): item is { id: string; profile: Profile; reactionType: string } => Boolean(item.profile)));
    } catch (error) {
      console.error("RP WORLD reaction users load failed", error);
      setCommentReactionUsers([]);
    } finally {
      setCommentReactionUsersBusy(false);
    }
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
      [postId]: (current[postId] ?? []).map((item) => {
        if (item.id !== comment.id) return item;
        const nextCounts = { ...(item.reactionCounts ?? {}) };
        if (previousType) {
          nextCounts[previousType] = Math.max(0, (nextCounts[previousType] ?? 0) - 1);
        }
        if (nextType) {
          nextCounts[nextType] = (nextCounts[nextType] ?? 0) + 1;
        }
        return {
          ...item,
          reactionType: nextType,
          reactionCount: Math.max(0, item.reactionCount + countDelta),
          reactionCounts: nextCounts,
        };
      }),
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

  function reactionEmoji(type: string | null) {
    return commentReactionOptions.find((reaction) => reaction.type === type)?.emoji ?? "♡";
  }

  function renderCommentTree(postId: string, comments: Comment[], parentId: string | null, depth = 0): ReactNode[] {
    const children = comments.filter((comment) => comment.parent_id === parentId);
    const visible = parentId === null ? children : (expandedReplyIds.has(parentId) ? children : children.slice(0, 2));
    return visible.map((comment) => {
      const replies = comments.filter((item) => item.parent_id === comment.id);
      const isEditing = commentEditId === comment.id;
      const reactionSummary = commentReactionOptions
        .filter((reaction) => (comment.reactionCounts?.[reaction.type] ?? 0) > 0)
        .sort((a, b) => (comment.reactionCounts?.[b.type] ?? 0) - (comment.reactionCounts?.[a.type] ?? 0))
        .slice(0, 3);
      if (comment.is_hidden && comment.author_id !== session?.user.id) return null;
      return (
        <div key={comment.id} className={depth > 0 ? "comment-thread-reply" : "comment-thread"}>
          <div className={`comment-row${replyTo?.commentId === comment.id ? " reply-target" : ""}`}>
            <button className={depth > 0 ? "avatar comment-avatar comment-avatar-reply profile-link-button" : "avatar comment-avatar profile-link-button"} type="button" onClick={() => void loadPublicProfile(comment.author_id)} aria-label="Open profile"
              style={comment.profile?.avatar_url ? { backgroundImage: `url(${comment.profile.avatar_url})` } : undefined}>
              {!comment.profile?.avatar_url && initials(comment.profile?.display_name ?? "RP")}
            </button>
            <div className="comment-body">
              <div className="comment-bubble"
                onPointerDown={() => {
                  if (commentLongPressRef.current) clearTimeout(commentLongPressRef.current);
                  commentLongPressRef.current = setTimeout(() => { setCommentActionTarget(comment); setCommentActionPostId(postId); }, 600);
                }}
                onPointerUp={() => { if (commentLongPressRef.current) clearTimeout(commentLongPressRef.current); commentLongPressRef.current = null; }}
                onPointerCancel={() => { if (commentLongPressRef.current) clearTimeout(commentLongPressRef.current); commentLongPressRef.current = null; }}
                onContextMenu={(event) => event.preventDefault()}>
                <button className="profile-name-link" type="button" onClick={() => void loadPublicProfile(comment.author_id)}>
                  {comment.profile?.display_name ?? "RP WORLD member"}
                </button>
                {comment.is_deleted ? (
                  <p className="comment-deleted">This comment was deleted.</p>
                ) : isEditing ? (
                  <div className="comment-edit-inline">
                    <textarea value={commentEditDraft} onChange={(event) => setCommentEditDraft(event.target.value)} maxLength={500} autoFocus />
                    <div><button type="button" onClick={() => setCommentEditId(null)}>Cancel</button><button type="button" disabled={commentActionBusy === comment.id} onClick={() => void manageComment(postId, comment, "edit", commentEditDraft)}>Save</button></div>
                  </div>
                ) : (
                  <>
                    {comment.content && <p>{comment.content}</p>}
                    {comment.media_url && (
                      <button className="comment-media-button" type="button" onClick={() => setActivePostMedia({ url: signedMediaUrls[getPostMediaPath(comment.media_url) ?? ""] ?? comment.media_url!, type: "image" })}>
                        <img src={signedMediaUrls[getPostMediaPath(comment.media_url) ?? ""] ?? comment.media_url} alt="Comment attachment" loading="lazy" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {!comment.is_deleted && (
                <>
                  <div className="comment-actions">
                    <div className="comment-reaction-wrap">
                      <button className={comment.reactionType ? "comment-action comment-reaction-trigger reaction-active" : "comment-action comment-reaction-trigger"} type="button"
                        onClick={() => setOpenReactionPicker(openReactionPicker === comment.id ? null : comment.id)}
                        disabled={commentReactionBusy === comment.id}
                        aria-label={comment.reactionType ? `Change reaction: ${commentReactionOptions.find((item) => item.type === comment.reactionType)?.label ?? "React"}` : "React to comment"}>
                        <span className="comment-reaction-trigger-emoji">{comment.reactionType ? reactionEmoji(comment.reactionType) : "♡"}</span>
                        <span>{comment.reactionType ? (commentReactionOptions.find((item) => item.type === comment.reactionType)?.label ?? "React") : "React"}</span>
                      </button>
                      {openReactionPicker === comment.id && (
                        <div className="comment-reaction-picker" role="menu" aria-label="Comment reactions" onClick={(event) => event.stopPropagation()}>
                          {commentReactionOptions.map((reaction) => (
                            <button key={reaction.type} className={comment.reactionType === reaction.type ? "comment-reaction-option active" : "comment-reaction-option"} type="button"
                              onClick={() => void setCommentReaction(postId, comment, reaction.type)} aria-label={reaction.label} title={reaction.label}>{reaction.emoji}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="comment-action" type="button" onClick={() => setReplyTo({ postId, commentId: comment.id })}>Reply</button>
                    <span className="comment-timestamp">{timeAgo(comment.created_at)}{comment.edited_at ? " (edited)" : ""}</span>
                    {comment.is_pinned && <span className="comment-pinned">Pinned</span>}
                  </div>
                  {comment.reactionCount > 0 && (
                    <button className="comment-reaction-summary" type="button" onClick={() => void showCommentReactionUsers(comment)} aria-label={`${comment.reactionCount} reactions`}>
                      {reactionSummary.map((reaction) => <span key={reaction.type}>{reaction.emoji}</span>)} <strong>{comment.reactionCount}</strong>
                    </button>
                  )}
                </>
              )}

              {replies.length > 0 && (
                <button className="comment-replies-toggle" type="button" onClick={() => setExpandedReplyIds((current) => {
                  const next = new Set(current);
                  if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id);
                  return next;
                })}>
                  <span className="comment-replies-line" aria-hidden="true" />
                  {expandedReplyIds.has(comment.id)
                    ? "Hide replies"
                    : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                </button>
              )}

              {commentMentionQuery[postId] !== null && commentMentionQuery[postId] !== undefined && (
                <div className="comment-mention-popover">
                  <span>Type a username mention: @{commentMentionQuery[postId]}</span>
                </div>
              )}
            </div>
          </div>
          {replies.length > 0 && renderCommentTree(postId, comments, comment.id, depth + 1)}
        </div>
      );
    });
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
        privacy: sharePrivacy,
      })
      .select("id, author_id, content, media_url, media_type, created_at, privacy, shared_post_id, share_caption")
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
      share_caption: data.share_caption, privacy: data.privacy ?? sharePrivacy, shared_original: sharedOriginal,
    };
    setPosts((current) => [sharedPost, ...current]);
    setShareOpen(false); setShareTarget(null); setShareCaption(""); setSharePrivacy("public");
    setMessage("Post shared to your feed.");
  }

  async function updatePostPrivacy(post: Post, privacy: "public" | "friends" | "only_me") {
    if (!supabase || !session?.user || post.author_id !== session.user.id || post.shared_post_id) return;
    setPrivacyBusy(true);
    const { data, error } = await supabase
      .from("posts")
      .update({ privacy })
      .eq("id", post.id)
      .eq("author_id", session.user.id)
      .select("id, privacy")
      .single();
    setPrivacyBusy(false);
    if (error || !data) {
      setMessage(error?.message || "Could not update post privacy.");
      return;
    }
    const patch = (item: Post): Post => item.id === post.id ? { ...item, privacy: data.privacy } : item;
    setPosts((items) => items.map(patch));
    setProfilePosts((items) => items.map(patch));
    setPublicProfilePosts((items) => items.map(patch));
    setPostActionTarget(null);
    setMessage("Post privacy updated.");
  }

  async function managePostAction(action: "pin" | "archive" | "trash" | "copy" | "delete_shared") {
    const post = postActionTarget;
    if (!supabase || !session?.user || !post || post.author_id !== session.user.id) return;

    if (action === "delete_shared") {
      if (!post.shared_post_id) return;
      setPostActionBusy(true);
      const { error: deleteError } = await supabase.from("posts").delete().eq("id", post.id).eq("author_id", session.user.id).not("shared_post_id", "is", null);
      setPostActionBusy(false);
      if (deleteError) { setMessage(deleteError.message || "Could not delete the shared post."); return; }
      const removeShared = (items: Post[]) => items.filter((item) => item.id !== post.id);
      setPosts(removeShared);
      setProfilePosts(removeShared);
      setPublicProfilePosts(removeShared);
      setProfileReposts(removeShared);
      setPostActionTarget(null);
      setMessage("Shared post deleted.");
      return;
    }

    if (post.shared_post_id) return;

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
    const payload: { pinned_at?: string | null; archived_at?: string | null; trashed_at?: string | null } =
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

  async function sharePostExternally(post: Post) {
    const original = post.shared_original ?? post;
    const shareText = post.share_caption?.trim() ? post.share_caption.trim() + "

" + original.content : original.content;
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
      <header className={`topbar glass ${view === "home" ? "home-topbar" : ""}`}>
        <button
          className="brand-button"
          type="button"
          onClick={() => setView("home")}
          aria-label="RP WORLD home"
        >
          <span className="brand-mark">
            <RPWorldMark />
          </span>

          <span>
            <small>ROLE PLAY WORLD</small>
            <strong>RP WORLD</strong>
          </span>
        </button>

        <div className="header-actions">
          <ThemePicker
            theme={theme}
            canUseAllThemes={hasPremiumThemes(profile)}
            onThemeChange={(nextTheme) => {
              setTheme(nextTheme);
              setMessage("");
            }}
            onLockedTheme={() => {
              setView("support");
              setSupportPlan("verified_3m_themes");
              setSupportMessage("All theme colors are included with the ₱250 verified membership.");
            }}
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
            <RPWorldMark />
          </div>

          <p className="eyebrow">
            {session ? "ACCESS GRANTED" : "RP WORLD"}
          </p>

          <h2>
            {session
              ? "Build your RP identity."
              : "Your RP world. Your identity. Your story."}
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

          <div className="status glass">            <span className="status-dot" />

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
            <div className={`page-heading ${view === "home" ? "home-page-heading" : ""}`}>
              <div>
                {view === "home" && <p className="eyebrow">RP WORLD FEED</p>}
                <h2 className={view === "home" ? `greeting-title greeting-${Math.min(3, Math.max(1, Math.ceil(title.length / 24)))}` : undefined}>{title}</h2>
              </div>
              <div className="page-heading-actions">
                <button className="glass circle-button" type="button" aria-label="Search" onClick={() => setView("search")}>
                  <Search size={17} />
                </button>
                {(view === "public" || viewAs) && (
                  <button className="glass circle-button" type="button" onClick={() => { if (view === "public") { setView("discover"); setPublicProfile(null); } else { setViewAs(false); setView("profile"); } }} aria-label="Back" title="Back">
                    <ArrowLeft size={17} />
                  </button>
                )}
              </div>
            </div>

            {view === "support" && (
              <section className="support-page" aria-labelledby="support-page-title">
                <div className="support-hero glass">
                  <div className="support-hero-icon"><ShieldCheck size={28} /></div>
                  <div>
                    <span className="support-eyebrow">RP WORLD VERIFIED</span>
                    <h3 id="support-page-title">Get verified.</h3>
                    <p>A visible verified badge for your RP identity, with an optional theme membership.</p>
                  </div>
                </div>

                <div className="verified-plan-grid">
                  {([
                    { id: "verified_2w", price: "₱50", duration: "2 weeks", detail: "Verified badge", badge: "STARTER" },
                    { id: "verified_1m", price: "₱100", duration: "1 month", detail: "Verified badge", badge: "POPULAR" },
                    { id: "verified_3m_themes", price: "₱250", duration: "3 months", detail: "Verified badge + all theme colors", badge: "FULL ACCESS" },
                  ] as const).map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      className={supportPlan === plan.id ? "verified-plan active" : "verified-plan"}
                      onClick={() => { setSupportPlan(plan.id); setSupportCheckoutUrl(null); setSupportMessage(""); }}
                    >
                      <span className="verified-plan-badge">{plan.badge}</span>
                      <strong>{plan.price}</strong>
                      <span>{plan.duration}</span>
                      <small>{plan.detail}</small>
                    </button>
                  ))}
                </div>

                <div className="support-card glass">
                  <div className="support-card-heading">
                    <div>
                      <span className="support-section-label">VERIFIED MEMBERSHIP</span>
                      <strong>{supportPlan === "verified_2w" ? "2 weeks verified" : supportPlan === "verified_1m" ? "1 month verified" : "3 months verified + all themes"}</strong>
                    </div>
                    <button className="glass circle-button" type="button" aria-label="Back to menu" onClick={() => setView("menu")}><ArrowLeft size={18} /></button>
                  </div>
                  <div className="verified-benefits">
                    <div><ShieldCheck size={17} /><span>Verified badge appears beside your RP identity.</span></div>
                    <div><Paintbrush size={17} /><span>{supportPlan === "verified_3m_themes" ? "Unlocks every RP WORLD theme color for 3 months." : "Free members keep Midnight and Ocean (blue)."}</span></div>
                    <div><CheckCheck size={17} /><span>One-time purchase. No automatic recurring charge.</span></div>
                  </div>
                  <div className="support-disclosure"><strong>Secure checkout</strong><span>Payment is handled on a PayMongo-hosted checkout. RP WORLD never receives your card or payment details.</span></div>
                  {supportMessage && <p className="support-message" role="status">{supportMessage}</p>}
                  {supportCheckoutUrl && <a className="support-checkout-link" href={supportCheckoutUrl} target="_blank" rel="noopener noreferrer"><ShieldCheck size={17} /><span>Open secure checkout</span></a>}
                  <button className="support-submit-button" type="button" disabled={supportBusy} onClick={() => void submitSupportIntent()}>{supportBusy ? "Preparing checkout…" : "Get verified for " + (supportPlan === "verified_2w" ? "₱50" : supportPlan === "verified_1m" ? "₱100" : "₱250")}</button>
                </div>
              </section>
            )}

            {view === "home" && (
              <>
                <Suspense fallback={<div className="stories-loading" aria-label="Loading stories" /> }><Stories session={session} profile={profile} /></Suspense>

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
                            {post.author_id === session?.user.id && (
                              <button
                                className="post-more-button"
                                type="button"
                                aria-label={post.shared_post_id ? "Shared post options" : "Post options"}
                                title={post.shared_post_id ? "Shared post options" : "Post options"}
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
                          <div className="post-tag-label">
                            <Tag size={12} />
                            <span>Tagged</span>
                            <div className="post-tagged-names">
                              {post.tagged_profiles.map((item) => (
                                <button
                                  key={item.id}
                                  className="post-tagged-name"
                                  type="button"
                                  onClick={() => void loadPublicProfile(item.id)}
                                  aria-label={`Open ${item.display_name} profile`}
                                >
                                  @{item.username}
                                </button>
                              ))}
                            </div>
                          </div>
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

                              <textarea
                                value={commentDrafts[post.id] ?? ""}
                                rows={1}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setCommentDrafts((current) => ({ ...current, [post.id]: value }));
                                  const cursor = event.target.selectionStart ?? value.length;
                                  const match = value.slice(0, cursor).match(/(?:^|\\s)@([a-zA-Z0-9_]*)$/);
                                  setCommentMentionQuery((current) => ({ ...current, [post.id]: match ? match[1] : null }));
                                  setCommentMentionStart((current) => ({ ...current, [post.id]: match ? cursor - match[1].length - 1 : null }));
                                  event.target.style.height = "auto";
                                  event.target.style.height = Math.min(event.target.scrollHeight, 140) + "px";
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault();
                                    void createComment(event as unknown as FormEvent, post.id);
                                  }
                                }}
                                placeholder={replyTo?.postId === post.id ? "Write a reply…" : "Write a comment…"}
                                maxLength={500}
                                aria-label="Write a comment"
                              />

                              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden id={`comment-media-${post.id}`} onChange={(event) => setCommentMediaFiles((current) => ({ ...current, [post.id]: event.target.files?.[0] ?? null }))} />
                              <button type="button" className="comment-media-trigger" aria-label="Add photo or GIF to comment" onClick={() => document.getElementById(`comment-media-${post.id}`)?.click()}><Image size={16} /></button>
                              {commentMediaFiles[post.id] && <span className="comment-media-selected">{commentMediaFiles[post.id]?.name}</span>}

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

            {view === "search" && (
              <section className="discover-section search-page">
                <div className="section-heading discover-heading"><div><p className="eyebrow">RP WORLD</p><h3>Search</h3></div></div>
                <div className="discover-search-wrap search-page-bar">
                  <Search size={16} aria-hidden="true" />
                  <input className="discover-search-input" type="search" value={discoverSearch} onChange={(event) => setDiscoverSearch(event.target.value)} placeholder="Search people, usernames, or bios" aria-label="Search RP WORLD" autoComplete="off" autoFocus />
                  {discoverSearch && <button className="discover-search-clear" type="button" onClick={() => setDiscoverSearch("")} aria-label="Clear search"><X size={15} /></button>}
                </div>
                {discoverProfiles.filter((person) => { const query = discoverSearch.trim().toLowerCase(); return !query || [person.display_name, person.username, person.bio ?? ""].some((value) => value.toLowerCase().includes(query)); }).length === 0 ? (
                  <div className="empty-state glass"><Search size={24} /><strong>{discoverSearch.trim() ? "No matching profiles." : "No other profiles yet."}</strong><span>{discoverSearch.trim() ? "Try another name or username." : "Search RP WORLD members by name or username."}</span></div>
                ) : (
                  <div className="discover-list">{discoverProfiles.filter((person) => { const query = discoverSearch.trim().toLowerCase(); return !query || [person.display_name, person.username, person.bio ?? ""].some((value) => value.toLowerCase().includes(query)); }).map((person) => (
                    <article className="discover-card glass" key={person.id}>
                      <button className="avatar profile-link-button" type="button" onClick={() => void loadPublicProfile(person.id)} aria-label="Open profile" style={person.avatar_url ? { backgroundImage: `url(${person.avatar_url})` } : undefined}>{!person.avatar_url && initials(person.display_name)}</button>
                      <div className="discover-info"><button className="profile-name-link" type="button" onClick={() => void loadPublicProfile(person.id)}>{person.display_name}</button><span>@{person.username}</span>{person.bio ? <p>{person.bio}</p> : null}</div>
                      <button className="profile-action-button" type="button" onClick={() => void loadPublicProfile(person.id)}>View</button>
                    </article>
                  ))}</div>
                )}
              </section>
            )}

            {view === "discover" && (
              <section className="discover-section">
                <div className="section-heading discover-heading"><div><p className="eyebrow">RP WORLD</p><h3>Explore RP WORLD</h3><span className="discover-subtitle">Choose a section to reveal its branches. The main view stays clean and organized.</span></div></div>
                <div className="discover-category-groups">
                  {[
                    {name:"Communities & Hoods",description:"RP spaces, groups, and communities.",icon:UsersRound,items:[
                      ["Arena / Gang","Competitive RP arenas and gangs.",UsersRound],["University / Academy","School and academy RP.",GraduationCap],["Family","RP family circles.",Users],["Sister Hood","Sisterhood communities.",Heart],["Brother Hood","Brotherhood communities.",UserRound],["Music Hood","Music communities.",Music],["Dance Hood","Dance communities.",Sparkles],["Ranter Hood","Rant and discussion communities.",MessageCircle],["Writer Hood","Writer communities.",PenLine],["Seller Hood","Seller communities.",ShoppingBag],["Buy & Sell","Marketplace spaces.",ShoppingBag],["Gaming Hood","Gaming communities.",Gamepad2],["Call Groups","Call communities.",Phone],["Models","Model communities.",UserRound],["Editor Hoods","Editing communities.",Camera],["Academic Commissioner","Academic-focused communities.",GraduationCap]]},
                    {name:"Activities & Events",description:"Games, events, and member-led activities.",icon:Sparkles,items:[
                      ["Arena Games","Games and activities hosted inside arenas.",Gamepad2],["Falling Game","Falling Game activities and rounds.",Gamepad2],["Community Activities","Member-led activities and interactions.",Users],["Events","RP WORLD events and special activities.",Sparkles],["Call Groups","Live call-based activities.",Phone],["Writing","Writing activities and events.",PenLine],["Editing","Creative editing activities.",Camera]]},
                    {name:"Library & Stories",description:"Stories, writers, reading, and saved content.",icon:BookOpen,items:[
                      ["Trending Stories","Stories getting attention.",TrendingUp],["New Stories","Recently published stories.",Sparkles],["Most Read","Stories with the most reads.",Trophy],["Most Saved","Stories saved most often.",BookOpen],["Writers","Explore RPW writers.",PenLine],["Your Library","Your saved reading list.",BookOpen]]},
                    {name:"RPW Rankings & Trends",description:"Organic discovery based on RP WORLD activity.",icon:TrendingUp,items:[
                      ["Trending Role Players","Role players gaining attention.",TrendingUp],["Rising Role Players","Role players growing in activity.",Sparkles],["Most Followed","Role players with the most followers.",Users],["Trending Hoods","Hoods gaining attention.",TrendingUp],["Most Active Hoods","Hoods with the most activity.",Trophy],["Longest-Running Hoods","Hoods with the longest RP history.",Clock],["Most Read Writers","Writers whose stories are read most.",BookOpen],["Most Saved Writers","Writers whose stories are saved most.",Heart],["Trending Writers","Writers currently trending.",PenLine]]},
                  ].map((category) => {
                    const CategoryIcon = category.icon;
                    const isOpen = openDiscoverCategory === category.name;
                    return <section className={`discover-category-group ${isOpen ? "is-open" : ""}`} key={category.name}>
                      <button className="discover-category-summary glass" type="button" aria-expanded={isOpen} onClick={() => setOpenDiscoverCategory(isOpen ? "" : category.name)}>
                        <span className="discover-category-icon"><CategoryIcon size={18}/></span>
                        <span className="discover-category-copy"><strong>{category.name}</strong><small>{category.description}</small></span>
                        <span className="discover-category-chevron"><ArrowUp size={15}/></span>
                      </button>
                      {isOpen && <div className="discover-category-grid">{category.items.map((item) => {
                        const [name,description,Icon] = item as [string,string,typeof Gamepad2?];
                        const ItemIcon = Icon ?? category.icon;
                        return <button className="discover-category-card glass" type="button" key={name}><span className="discover-category-icon"><ItemIcon size={17}/></span><span className="discover-category-copy"><strong>{name}</strong><small>{description}</small></span></button>;
                      })}</div>}
                    </section>;
                  })}
                  <section className="discover-category-group">
                    <button className="discover-category-summary glass" type="button" aria-expanded={openDiscoverCategory === "RPW News"} onClick={() => setOpenDiscoverCategory(openDiscoverCategory === "RPW News" ? "" : "RPW News")}>
                      <span className="discover-category-icon"><Newspaper size={18}/></span>
                      <span className="discover-category-copy"><strong>RPW News</strong><small>Updates, announcements, featured moments, and platform news.</small></span>
                      <span className="discover-category-chevron"><ArrowUp size={15}/></span>
                    </button>
                  </section>
                </div>
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
                            {(isVerifiedProfile(profile) || isAdminProfile(profile, adminUserIds)) && <span className="verified-badge" aria-label="Verified">✓</span>}
                          </h2>

                          <span>
                            @{profile.username}
                          </span>
                        </div>
                      </div>

                      {profile.bio ? <p className="profile-bio">{profile.bio}</p> : null}

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
                        <button className="profile-meta-button" type="button" onClick={() => void openFollowers(session?.user.id ?? profile.id, profile.display_name)} aria-label="View followers">
                          <User size={13} />
                          {profileStats.followers} {profileStats.followers === 1 ? "follower" : "followers"}
                        </button>
                        <span>
                          <Heart size={13} />
                          {profileStats.likes} {profileStats.likes === 1 ? "like" : "likes"}
                        </span>
                        <span>
                          <MapPin size={13} />
                          RP WORLD
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
                                <strong>{post.profile?.display_name ?? "RP WORLD member"}{(isVerifiedProfile(post.profile) || isAdminProfile(post.profile, adminUserIds)) && <span className="verified-badge" aria-label="Verified">✓</span>}</strong>
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
                      <div className="profile-name-row"><div><h2>{publicProfile.display_name}{(isVerifiedProfile(publicProfile) || isAdminProfile(publicProfile, adminUserIds)) && <span className="verified-badge" aria-label="Verified">✓</span>}</h2><span>@{publicProfile.username}</span></div></div>
                      {publicProfile.bio ? <p className="profile-bio">{publicProfile.bio}</p> : null}
                      <div className="profile-actions profile-social-actions">
                        <button className={publicProfileFriend ? "profile-action-button follow-button friend-button" : "profile-action-button follow-button"} type="button" onClick={() => void toggleFollowPublicProfile()}><UserPlus size={14} />{publicProfileFriend ? "Friends" : followingPublicProfile ? "Following" : "Follow"}</button>
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
                      {friendActionsOpen && publicProfileFriend && (
                        <div className="friend-actions-popover" role="dialog" aria-label="Friend options">
                          <div className="friend-actions-title">Friends</div>
                          <button type="button" className="friend-action-danger" onClick={() => void unfriendPublicProfile()} disabled={friendActionBusy}>
                            <UserPlus size={15} />
                            {friendActionBusy ? "Updating…" : "Unfriend / Unfollow"}
                          </button>
                          <button type="button" className="friend-action-back" onClick={() => setFriendActionsOpen(false)} disabled={friendActionBusy}>
                            <ArrowLeft size={15} />
                            Back
                          </button>
                        </div>
                      )}
                      <div className="profile-meta">
                        <span><Sparkles size={13} />{publicProfile.rp_id}</span>
                        <button className="profile-meta-button" type="button" onClick={() => void openFollowers(publicProfile.id, publicProfile.display_name)} aria-label="View followers"><User size={13} />{profileStats.followers} {profileStats.followers === 1 ? "follower" : "followers"}</button>
                        <span><Heart size={13} />{profileStats.likes} {profileStats.likes === 1 ? "like" : "likes"}</span>
                        <span><MapPin size={13} />RP WORLD</span>
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
                        <div className="post-head">
                          <button
                            className="avatar profile-link-button"
                            type="button"
                            aria-label={`Open ${post.profile?.display_name ?? "member"} profile`}
                            onClick={() => void loadPublicProfile(post.author_id)}
                            style={post.profile?.avatar_url ? { backgroundImage: `url(${post.profile.avatar_url})` } : undefined}
                          >
                            {!post.profile?.avatar_url && initials(post.profile?.display_name ?? "RP")}
                          </button>
                          <div>
                            {post.author_id === session?.user.id && (
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
                            <button className="profile-name-link" type="button" onClick={() => void loadPublicProfile(post.author_id)}>
                              {post.profile?.display_name ?? "RP WORLD member"}
                            </button>
                            {(isVerifiedProfile(post.profile) || isAdminProfile(post.profile, adminUserIds)) && <span className="verified-badge" aria-label="Verified">✓</span>}
                            <span className="post-meta">
                              @{post.profile?.username ?? "member"} ·{" "}
                              <button
                                className="timestamp-button"
                                type="button"
                                onClick={() => setOpenTimestamp(openTimestamp === post.id ? null : post.id)}
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
                        {renderExpandablePostContent(post.content, post.id)}                        {renderPostMedia(post.media_url, post.media_type)}
                        {post.pinned_at && <div className="post-status-label"><Pin size={12} /> Pinned</div>}
                        {post.tagged_profiles?.length ? (
                          <div className="post-tag-label"><Tag size={12} /> {post.tagged_profiles.map((item) => `@${item.username}`).join(", ")}</div>
                        ) : null}
                        <div className="post-actions">
                          <button className={post.liked ? "post-action liked" : "post-action"} type="button" onClick={() => void toggleLike(post)}>
                            <Heart size={17} fill={post.liked ? "currentColor" : "none"} />{post.likes}
                          </button>
                          <button className={openComments === post.id ? "post-action active" : "post-action"} type="button" onClick={() => void toggleComments(post.id)}>
                            <MessageCircle size={17} /> {post.comments || "Reply"}
                          </button>
                          <button className={post.reposted ? "post-action reposted" : "post-action"} type="button" onClick={() => void repostPost(post)} disabled={repostBusy === post.id} title={post.reposted ? "Reposted" : "Repost"}>
                            <Repeat2 size={17} />{post.reposts || 0}
                          </button>
                          <button className="post-action" type="button" onClick={() => void sharePost(post)}>
                            <Share2 size={17} /> Share
                          </button>
                        </div>
                        {openComments === post.id && (
                          <div className="comments-panel">
                            <div className="comments-list">
                              {(commentsByPost[post.id] ?? []).length === 0 ? (
                                <span className="comments-empty">No replies yet. Start the conversation.</span>
                              ) : (
                                renderCommentTree(post.id, commentsByPost[post.id] ?? [], null)
                              )}
                            </div>
                            {replyTo?.postId === post.id && (
                              <div className="replying-to">
                                <span>Replying to <strong>{commentsByPost[post.id]?.find((item) => item.id === replyTo.commentId)?.profile?.display_name ?? "comment"}</strong></span>
                                <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X size={13} /></button>
                              </div>
                            )}
                            <form className="comment-form" onSubmit={(event) => void createComment(event, post.id)}>
                              <span className="avatar small-avatar" style={profile?.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : undefined}>
                                {!profile?.avatar_url && initials(profile?.display_name ?? "RP")}
                              </span>
                              <input
                                value={commentDrafts[post.id] ?? ""}
                                onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                                placeholder={replyTo?.postId === post.id ? "Write a reply..." : "Write a comment..."}
                                maxLength={500}
                                aria-label={replyTo?.postId === post.id ? "Write a reply" : "Write a comment"}
                              />
                              <button type="submit" disabled={commentBusy === post.id || !commentDrafts[post.id]?.trim()}>{commentBusy === post.id ? "…" : "Post"}</button>
                            </form>
                          </div>
                        )}
                      </article>
                    ))}</div>
                  )}
                </div>
              </section>
            )}

            {view === "suggestions" && session && profile && (
              <Suspense fallback={<div className="page-loading" aria-label="Loading suggestions" /> }><SuggestionsPage session={session} /></Suspense>
            )}

            {view === "admin" && session && profile && isAdmin && (
              <Suspense fallback={<div className="page-loading" aria-label="Loading admin" /> }><AdminPanelPage /></Suspense>
            )}

            {view === "menu" && (
              <div className="menu-card glass">
                <div className="menu-progress-notice">
                  <span className="menu-progress-icon" aria-hidden="true">🚧</span>
                  <div>
                    <strong>RP WORLD is still in progress.</strong>
                    <span>Some features may be added, changed, or improved as the app continues to grow.</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="menu-feature-button"
                  onClick={() => setView("suggestions")}
                >
                  <Sparkles size={18} />
                  <span>Suggestions</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    className="menu-feature-button admin-menu-button"
                    onClick={() => setView("admin")}
                  >
                    <ShieldCheck size={18} />
                    <span>Admin Panel</span>
                  </button>
                )}
                <button
                  type="button"
                  className="menu-feature-button support-menu-button"
                  onClick={() => {
                    setSupportMessage("");
                    setSupportCheckoutUrl(null);
                    setSupportPlan("verified_2w");
                    setView("support");
                  }}
                >
                  <ShieldCheck size={18} />
                  <span>Support RP WORLD</span>
                </button>

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
                  onClick={() => void openMessageInbox()}
                >
                  <MessageCircle size={18} />
                  Messages
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setView("discover")
                  }
                >
                  <LayoutGrid size={18} />
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
            onPointerDown={() => {}}
            onPointerUp={() => setView("home")}
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
            onPointerUp={() => setView("discover")}
          >
            <LayoutGrid size={19} />
            <span>Discover</span>
          </button>

          <button
            className="nav-create"
            type="button"
            aria-label="Messages"
            onPointerDown={startScreenshotLongPress}
            onPointerUp={() => finishScreenshotPress(() => void openMessageInbox())}
            onPointerCancel={cancelScreenshotLongPress}
            onContextMenu={(event) => event.preventDefault()}
          >
            <Send size={22} strokeWidth={1.9} />
          </button>

          <button
            className={
              view === "profile"
                ? "nav-item active"
                : "nav-item"
            }
            type="button"
            onPointerUp={() => setView("profile")}
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
            onPointerUp={openMenu}
          >
            <Menu size={19} />
            <span>Menu</span>
          </button>
        </nav>
      )}

      {screenshotOpen && screenshotDataUrl && (
        <div className="screenshot-editor" role="presentation" onClick={() => setScreenshotOpen(false)}>
          <section className="screenshot-editor-card glass" role="dialog" aria-modal="true" aria-labelledby="screenshot-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <div><p className="eyebrow">RP WORLD</p><h2 id="screenshot-title">Screenshot</h2></div>
              <button className="icon-button" type="button" aria-label="Discard screenshot" onClick={() => setScreenshotOpen(false)}><X size={18}/></button>
            </div>
            <div className="screenshot-preview">
              <canvas
                ref={screenshotCanvasRef}
                className="screenshot-draw-canvas"
                aria-label="Screenshot preview"
                onPointerDown={drawOnScreenshot}
                onPointerMove={drawOnScreenshot}
              />
            </div>
            {screenshotEditing && (
              <div className="screenshot-edit-tools">
                <button type="button" className={screenshotDrawing ? "screenshot-tool active" : "screenshot-tool"} onClick={() => setScreenshotDrawing((value) => !value)}><Pencil size={16}/>Draw</button>
                <button type="button" className="screenshot-tool" onClick={() => cropScreenshot(1)}><span>1:1</span>Crop</button>
                <button type="button" className="screenshot-tool" onClick={() => cropScreenshot(4/5)}><span>4:5</span>Crop</button>
                <button type="button" className="screenshot-tool" onClick={() => cropScreenshot(16/9)}><span>16:9</span>Crop</button>
              </div>
            )}
            <div className="screenshot-actions">
              <button className="mode-switch screenshot-discard" type="button" onClick={() => setScreenshotOpen(false)}>Discard</button>
              <button className="mode-switch" type="button" onClick={() => setScreenshotEditing((value) => !value)}><Pencil size={15}/> {screenshotEditing ? "Done editing" : "Edit"}</button>
              <button className="primary-button" type="button" onClick={() => void saveScreenshot()}>Save screenshot</button>
            </div>
          </section>
        </div>
      )}

      {messageInboxOpen && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setMessageInboxOpen(false)}>
          <section className="message-sheet glass message-inbox-sheet" role="dialog" aria-modal="true" aria-labelledby="message-inbox-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <div><p className="eyebrow">RP WORLD</p><h2 id="message-inbox-title">Messages</h2></div>
              <button className="icon-button" type="button" aria-label="Close messages" onClick={() => setMessageInboxOpen(false)}><X size={18} /></button>
            </div>
            <div className="message-inbox-list">
              {messageConversations.length === 0 ? (
                <div className="empty-state message-empty-state">
                  <MessageCircle size={22} />
                  <strong>No conversations yet.</strong>
                  <span>Become friends with another RP WORLD member, then use Message on their profile.</span>
                </div>
              ) : (
                messageConversations.map((conversation) => (
                  <button
                    className="message-conversation"
                    key={conversation.id}
                    type="button"
                    onClick={() => void openConversationById(conversation.id)}
                  >
                    <span
                      className="avatar"
                      style={conversation.otherProfile.avatar_url ? { backgroundImage: `url(${conversation.otherProfile.avatar_url})` } : undefined}
                    >
                      {!conversation.otherProfile.avatar_url && initials(conversation.otherProfile.display_name)}
                    </span>
                    <span className="message-conversation-copy">
                      <strong>{conversation.otherProfile.display_name}</strong>
                      <small>@{conversation.otherProfile.username}</small>
                      <span>{conversation.lastMessage}</span>
                    </span>
                    <time>{timeAgo(conversation.lastMessageAt)}</time>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
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
        <div className="sheet-backdrop message-backdrop" role="presentation" onClick={() => {
          setActiveConversation(null);
          setActiveConversationProfile(null);
        }}>
          <section className="message-sheet glass" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="message-chat-header">
              <button className="message-back-button" type="button" aria-label="Back to messages" onClick={() => {
                setActiveConversation(null);
                setActiveConversationProfile(null);
              }}>
                <ArrowLeft size={18} />
              </button>
              {activeConversationProfile && (
                <span
                  className="avatar message-header-avatar"
                  style={activeConversationProfile.avatar_url ? { backgroundImage: `url(${activeConversationProfile.avatar_url})` } : undefined}
                >
                  {!activeConversationProfile.avatar_url && initials(activeConversationProfile.display_name)}
                </span>
              )}
              <div className="message-chat-identity">
                <strong>{getChatDisplayName(activeConversationProfile)}</strong>
                {activeConversationProfile && (
                  <span className={onlineUserIds.has(activeConversationProfile.id) ? "message-online" : "message-offline"}>
                    <i aria-hidden="true" />
                    {onlineUserIds.has(activeConversationProfile.id) ? "Active now" : "Offline"}
                  </span>
                )}
              </div>
              <div className="message-chat-actions">
                <button className="message-header-action" type="button" aria-label="Call" title="Call" onClick={() => setMessage("Voice and video calls are coming soon.")}>
                  <Phone size={18} />
                </button>
                <button className="message-header-action" type="button" aria-label="Chat settings" title="Chat settings" onClick={openMessageSettings}>
                  <Settings size={18} />
                </button>
              </div>
            </div>
            <div className="message-list" ref={messageListRef} role="log" aria-live="polite" onContextMenu={(event) => event.preventDefault()}>
              {messageLoadingOlder && <div className="message-loading-older">Loading earlier messages…</div>}
              {(messagesByConversation[activeConversation] ?? []).length === 0 ? (
                <div className="message-chat-empty">
                  <span className="avatar message-empty-avatar">
                    {activeConversationProfile?.avatar_url ? (
                      <span style={{ backgroundImage: `url(${activeConversationProfile.avatar_url})` }} />
                    ) : initials(activeConversationProfile?.display_name ?? "RP")}
                  </span>
                  <strong>Start a conversation</strong>
                  <span>Send a message to {activeConversationProfile?.display_name ?? "this member"}.</span>
                </div>
              ) : (
                (messagesByConversation[activeConversation] ?? []).map((item, index, items) => {
                  const previous = items[index - 1];
                  const next = items[index + 1];
                  const mine = item.sender_id === session?.user.id;
                  const samePrevious = previous?.sender_id === item.sender_id;
                  const sameNext = next?.sender_id === item.sender_id;
                  const expanded = expandedMessageTimestamps[item.id] ?? false;
                  const reactions = item.reactions ?? [];
                  const reactionCounts = reactions.reduce<Record<string, number>>((acc, reaction) => { acc[reaction.reaction_type] = (acc[reaction.reaction_type] ?? 0) + 1; return acc; }, {});
                  const myReaction = reactions.find((reaction) => reaction.user_id === session?.user.id)?.reaction_type;
                  const reactionEmoji: Record<string,string> = { like:"👍", love:"❤️", care:"🥰", haha:"😂", wow:"😮", sad:"😢", angry:"😡" };
                  const replyTarget = item.reply_to_id ? items.find((candidate) => candidate.id === item.reply_to_id) : null;
                  return (
                    <div
                      className={`message-row ${mine ? "mine" : "received"} ${samePrevious ? "message-grouped" : ""}`}
                      key={item.id}
                      onDoubleClick={() => setMessageReplyTarget(item)}
                      onPointerDown={(event) => {
                        if (event.button !== 0 && event.pointerType !== "touch") return;
                        if (messageLongPressRef.current) clearTimeout(messageLongPressRef.current);
                        messageLongPressRef.current = setTimeout(() => setMessageActionTarget(item), 550);
                      }}
                      onPointerUp={() => { if (messageLongPressRef.current) clearTimeout(messageLongPressRef.current); }}
                      onPointerCancel={() => { if (messageLongPressRef.current) clearTimeout(messageLongPressRef.current); }}
                    >
                      {!mine && !samePrevious && (
                        <span className="message-row-avatar avatar" style={activeConversationProfile?.avatar_url ? { backgroundImage: `url(${activeConversationProfile.avatar_url})` } : undefined}>
                          {!activeConversationProfile?.avatar_url && initials(activeConversationProfile?.display_name ?? "RP")}
                        </span>
                      )}
                      <div className={`message-bubble ${mine ? "mine" : "received"} ${samePrevious ? "grouped-start" : "grouped-first"} ${sameNext ? "grouped-middle" : "grouped-last"}`}>
                        {replyTarget && <button className="message-reply-preview" type="button" onClick={() => setExpandedMessageTimestamps((current) => ({ ...current, [replyTarget.id]: true }))}><span>Replying to</span><strong>{replyTarget.content || "Attachment"}</strong></button>}
                        {item.unsent_at ? <span className="message-unsent">Message unsent</span> : (
                          <>
                            {item.media_url && item.media_type?.startsWith("image/") && <img className="message-media-preview" src={item.media_url} alt="Message attachment" loading="lazy" />}
                            {item.media_url && item.media_type?.startsWith("video/") && <video className="message-media-preview" controls playsInline preload="metadata" src={item.media_url} />}
                            {item.media_url && item.media_type?.startsWith("audio/") && <audio className="message-audio" controls src={item.media_url} />}
                            {item.content && <span>{item.content}</span>}
                          </>
                        )}
                        {reactions.length > 0 && (
                          <button className="message-reaction-summary" type="button" onClick={() => setMessageReactionTarget(item.id)}>
                            {Object.entries(reactionCounts).slice(0,3).map(([type]) => <span key={type}>{reactionEmoji[type] ?? "•"}</span>)}<b>{reactions.length}</b>
                          </button>
                        )}
                        <div className="message-bubble-meta">
                          <button className="message-time" type="button" onClick={() => setExpandedMessageTimestamps((current) => ({ ...current, [item.id]: !expanded }))}>
                            {expanded ? formatMessageDateTime(item.created_at) : formatMessageTime(item.created_at)}
                          </button>
                          {mine && <span className="message-status">{item.status === "sending" ? "Sending" : item.status === "failed" ? "Not sent" : item.read_at ? "Read" : item.delivered_at ? "Delivered" : "Sent"} {item.status === "sending" ? "" : <CheckCheck size={12} />}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {messageTypingUsers.size > 0 && <div className="message-typing"><span/><span/><span/></div>}
            </div>
            <form className="message-form" onSubmit={sendMessage}>
              <input ref={messageMediaRef} className="message-media-input" type="file" accept="image/*,video/*" onChange={(event) => { setMessageMediaFile(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
              {messageReplyTarget && <div className="message-reply-composer"><span>Replying to {messageReplyTarget.content || "attachment"}</span><button type="button" onClick={() => setMessageReplyTarget(null)} aria-label="Cancel reply"><X size={14}/></button></div>}
              {messageMediaFile && <div className="message-attachment-chip"><Image size={14}/><span>{messageMediaFile.name}</span><button type="button" onClick={() => setMessageMediaFile(null)} aria-label="Remove attachment"><X size={13}/></button></div>}
              <button className="message-compose-action" type="button" aria-label="More" title="More" onClick={() => messageMediaRef.current?.click()}><Plus size={20} strokeWidth={2.2} /></button>
              <button className="message-compose-action" type="button" aria-label="Camera" title="Camera" onClick={() => messageMediaRef.current?.click()}><Camera size={19} strokeWidth={2.1} /></button>
              <button className="message-compose-action" type="button" aria-label="Photos and videos" title="Photos and videos" onClick={() => messageMediaRef.current?.click()}><Image size={19} strokeWidth={2.1} /></button>
              <button className={messageVoiceRecording ? "message-compose-action recording" : "message-compose-action"} type="button" aria-label={messageVoiceRecording ? "Stop voice message" : "Voice message"} title={messageVoiceRecording ? "Stop recording" : "Voice message"} onClick={() => void toggleVoiceRecording()}><Mic size={19} strokeWidth={2.1} /></button>
              <div className="message-input-shell">
                <textarea value={messageDraft} onChange={(event) => emitMessageTyping(event.target.value)} placeholder="Message" maxLength={2000} rows={1} autoFocus aria-label="Write a message"
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (messageDraft.trim() || messageMediaFile) void sendMessage(event as unknown as FormEvent); } }}
                />
                <button className="message-send-button" type="submit" disabled={!messageDraft.trim() && !messageMediaFile}><ArrowUp size={18} strokeWidth={2.5} /></button>
              </div>
            </form>
          </section>
        </div>
      )}

      {messageActionTarget && activeConversation && (
        <div className="sheet-backdrop message-action-backdrop" role="presentation" onClick={() => setMessageActionTarget(null)}>
          <section className="message-action-sheet glass" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">MESSAGE</p>
            <h3>Message options</h3>
            <button type="button" onClick={() => { setMessageReplyTarget(messageActionTarget); setMessageActionTarget(null); }}><MessageCircle size={16}/> Reply</button>
            <button type="button" onClick={() => { setMessageReactionTarget(messageActionTarget.id); setMessageActionTarget(null); }}><Heart size={16}/> React</button>
            {messageActionTarget.sender_id === session?.user.id && messageIsEditable(messageActionTarget) && (
              <button type="button" onClick={() => { setMessageEditTarget(messageActionTarget); setMessageEditDraft(messageActionTarget.content); setMessageActionTarget(null); }}><Pencil size={16}/> Edit</button>
            )}
            {messageActionTarget.sender_id === session?.user.id && !messageActionTarget.unsent_at && (
              <button className="danger" type="button" onClick={() => void unsendMessage(messageActionTarget)}><Trash2 size={16}/> Unsend</button>
            )}
            <button type="button" onClick={() => { void navigator.clipboard?.writeText(messageActionTarget.content); setMessageActionTarget(null); }}><Link2 size={16}/> Copy text</button>
          </section>
        </div>
      )}

      {messageReactionTarget && activeConversation && (
        <div className="message-reaction-backdrop" role="presentation" onClick={() => setMessageReactionTarget(null)}>
          <div className="message-reaction-picker glass" role="dialog" aria-label="Choose a reaction" onClick={(event) => event.stopPropagation()}>
            {[
              ["like","👍"],["love","❤️"],["care","🥰"],["haha","😂"],["wow","😮"],["sad","😢"],["angry","😡"],
            ].map(([type, emoji]) => (
              <button key={type} type="button" aria-label={type} onClick={() => { void toggleMessageReaction(messageReactionTarget, type); setMessageReactionTarget(null); }}>{emoji}</button>
            ))}
          </div>
        </div>
      )}

      {messageEditTarget && activeConversation && (
        <div className="sheet-backdrop message-edit-backdrop" role="presentation" onClick={() => setMessageEditTarget(null)}>
          <section className="message-edit-sheet glass" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">EDIT MESSAGE</p>
            <h3>Edit message</h3>
            <textarea value={messageEditDraft} onChange={(event) => setMessageEditDraft(event.target.value)} autoFocus maxLength={2000}/>
            <div className="message-settings-actions"><button className="mode-switch" type="button" onClick={() => setMessageEditTarget(null)}>Cancel</button><button className="primary-button" type="button" onClick={() => void saveEditedMessage()}>Save</button></div>
          </section>
        </div>
      )}

            {messageSettingsOpen && activeConversationProfile && (
        <div className="sheet-backdrop message-settings-backdrop" role="presentation" onClick={() => setMessageSettingsOpen(false)}>
          <section className="message-settings-sheet glass" role="dialog" aria-modal="true" aria-labelledby="message-settings-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <div><p className="eyebrow">CHAT SETTINGS</p><h2 id="message-settings-title">Conversation</h2></div>
              <button className="icon-button" type="button" aria-label="Close settings" onClick={() => setMessageSettingsOpen(false)}><X size={18} /></button>
            </div>
            <form className="message-settings-form" onSubmit={saveMessageSettings}>
              <label>
                <span>Nickname</span>
                <small>Only you will see this name in this conversation.</small>
                <input value={chatNickname} onChange={(event) => setChatNickname(event.target.value)} placeholder={activeConversationProfile.display_name} maxLength={40} autoFocus />
              </label>
              <div className="message-settings-actions">
                <button className="mode-switch" type="button" onClick={() => { setChatNickname(""); }}>Clear</button>
                <button className="primary-button" type="submit">Save</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {shareOpen && shareTarget && session && profile && (
        <div className="sheet-backdrop" role="presentation" onClick={() => { setShareOpen(false); setSharePrivacy("public"); }}>
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
            <label className="post-privacy-picker">
              <span><Globe2 size={15} /> Who can see your shared post?</span>
              <select value={sharePrivacy} onChange={(event) => setSharePrivacy(event.target.value as "public" | "friends" | "only_me")}>
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="only_me">Only me</option>
              </select>
            </label>
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

      {commentActionTarget && commentActionPostId && session && profile && (
        <div className="sheet-backdrop comment-action-backdrop" role="presentation" onClick={() => !commentActionBusy && setCommentActionTarget(null)}>
          <section className="comment-action-sheet glass" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">COMMENT</p>
            <h3>Comment options</h3>
            <button type="button" onClick={() => { setCommentEditId(commentActionTarget.id); setCommentEditDraft(commentActionTarget.content); setCommentActionTarget(null); }}>
              <Pencil size={16} /> Edit comment/reply
            </button>
            <button type="button" onClick={() => { void navigator.clipboard?.writeText(commentActionTarget.content); setCommentActionTarget(null); }}>
              <Link2 size={16} /> Copy
            </button>
            {!commentActionTarget.parent_id && (
              <button type="button" onClick={() => void manageComment(commentActionPostId, commentActionTarget, "pin")}>
                <Pin size={16} /> {commentActionTarget.is_pinned ? "Unpin comment" : "Pin comment"}
              </button>
            )}
            <button type="button" onClick={() => void manageComment(commentActionPostId, commentActionTarget, "hide")}>
              <EyeOff size={16} /> {commentActionTarget.is_hidden ? "Show comment" : "Hide comment"}
            </button>
            <button className="danger" type="button" onClick={() => void manageComment(commentActionPostId, commentActionTarget, "delete")}>
              <Trash2 size={16} /> Delete comment
            </button>
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
              {postActionTarget.shared_post_id ? (
                <>
                  <button className="post-action-destructive" type="button" onClick={() => void managePostAction("delete_shared")} disabled={postActionBusy}>
                    <Trash2 size={18} /><span>{postActionBusy ? "Deleting…" : "Delete shared post"}</span>
                  </button>
                  <button type="button" onClick={() => void managePostAction("copy")} disabled={postActionBusy}>
                    <Link2 size={18} /><span>Copy link</span>
                  </button>
                  <button type="button" onClick={() => setPostActionTarget(null)} disabled={postActionBusy}>
                    <X size={18} /><span>Back</span>
                  </button>
                </>
              ) : (
              <>
              <button type="button" onClick={() => void managePostAction("pin")} disabled={postActionBusy}>
                <Pin size={18} /><span>{postActionTarget.pinned_at ? "Unpin post" : "Pin post"}</span>
              </button>
              <button type="button" onClick={() => void openTagPost(postActionTarget)}>
                <Tag size={18} /><span>Tag</span>
              </button>
              <button type="button" onClick={() => { const target = postActionTarget; setPostActionTarget(null); openEditPost(target); }}>
                <Pencil size={18} /><span>Edit post</span>
              </button>
              <button type="button" onClick={() => void updatePostPrivacy(postActionTarget, postActionTarget.privacy === "public" ? "friends" : postActionTarget.privacy === "friends" ? "only_me" : "public")} disabled={privacyBusy}>
                {postActionTarget.privacy === "public" ? <Globe2 size={18} /> : postActionTarget.privacy === "friends" ? <Users size={18} /> : <LockKeyhole size={18} />}
                <span>{privacyBusy ? "Saving…" : `Privacy · ${postActionTarget.privacy === "public" ? "Public" : postActionTarget.privacy === "friends" ? "Friends" : "Only me"}`}</span>
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
              </>
              )}
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

              <label className="post-privacy-picker">
                <span><Globe2 size={15} /> Who can see this?</span>
                <select value={postPrivacy} onChange={(event) => setPostPrivacy(event.target.value as "public" | "friends" | "only_me")}>
                  <option value="public">Public</option>
                  <option value="friends">Friends</option>
                  <option value="only_me">Only me</option>
                </select>
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

                {authMode === "login" && (
                  <label className="stay-signed-in-option">
                    <input
                      type="checkbox"
                      checked={staySignedIn}
                      onChange={(event) => setStaySignedIn(event.target.checked)}
                    />
                    <span>Stay signed in</span>
                  </label>
                )}

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
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
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

      {followersOpen && (
        <div className="sheet-backdrop followers-backdrop" role="presentation" onClick={() => setFollowersOpen(false)}>
          <section className="followers-sheet glass" role="dialog" aria-modal="true" aria-labelledby="followers-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header"><div><p className="eyebrow">FOLLOWERS</p><h2 id="followers-title">{followersOwnerName}</h2></div><button className="icon-button" type="button" aria-label="Close followers" onClick={() => setFollowersOpen(false)}><X size={18} /></button></div>
            {followersBusy ? <div className="followers-loading">Loading followers…</div> : followers.filter((item) => !hiddenFollowerIds.has(item.id)).length === 0 ? <div className="followers-empty"><User size={22} /><strong>No followers yet.</strong><span>When people follow this profile, they will appear here.</span></div> : <div className="followers-list">{followers.filter((item) => !hiddenFollowerIds.has(item.id)).map((item) => (
              <div className="follower-row" key={item.id}>
                <button className="follower-identity" type="button" onClick={() => void loadPublicProfile(item.id)}><div className="avatar follower-avatar" style={item.profile.avatar_url ? { backgroundImage: "url(" + item.profile.avatar_url + ")" } : undefined}>{!item.profile.avatar_url && initials(item.profile.display_name)}</div><span><strong>{item.profile.display_name}</strong><small>@{item.profile.username}</small><em>Followed {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(item.followedAt))}</em></span></button>
                <div className="follower-actions">{item.id !== session?.user.id && <button className={item.followingBack ? "follower-action following" : "follower-action"} type="button" onClick={() => void followBackFollower(item.id)} disabled={item.followingBack}><UserPlus size={14} />{item.followingBack ? "Following" : "Follow back"}</button>}<button className="follower-action follower-hide" type="button" onClick={() => setHiddenFollowerIds((current) => new Set(current).add(item.id))}>Hide</button></div>
              </div>
            ))}</div>}
          </section>
        </div>
      )}

      {commentActionTarget && commentActionPostId && (
        <div className="sheet-backdrop comment-action-backdrop" role="presentation" onClick={() => setCommentActionTarget(null)}>
          <section className="comment-action-sheet glass" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">COMMENT</p>
            {commentActionTarget.author_id === session?.user.id ? (
              <>
                <button type="button" onClick={() => { setCommentEditId(commentActionTarget.id); setCommentEditDraft(commentActionTarget.content); setCommentActionTarget(null); }}><Pencil size={16} /> Edit comment/reply</button>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(commentActionTarget.content); setCommentActionTarget(null); }}><Link2 size={16} /> Copy</button>
                <button type="button" className="danger" disabled={commentActionBusy === commentActionTarget.id} onClick={() => void manageComment(commentActionPostId, commentActionTarget, "delete")}><Trash2 size={16} /> Delete</button>
              </>
            ) : (
              <button type="button" onClick={() => { navigator.clipboard?.writeText(commentActionTarget.content); setCommentActionTarget(null); }}><Link2 size={16} /> Copy</button>
            )}
            <button type="button" onClick={() => setCommentActionTarget(null)}><X size={16} /> Back</button>
          </section>
        </div>
      )}

      {commentReactionUsersOpen && (
        <div className="sheet-backdrop comment-reaction-users-backdrop" role="presentation" onClick={() => setCommentReactionUsersOpen(false)}>
          <section className="comment-reaction-users-sheet glass" role="dialog" aria-modal="true" aria-labelledby="comment-reaction-users-title" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header"><div><p className="eyebrow">REACTIONS</p><h2 id="comment-reaction-users-title">People who reacted</h2></div><button className="icon-button" type="button" onClick={() => setCommentReactionUsersOpen(false)}><X size={18} /></button></div>
            {commentReactionUsersBusy ? <div className="followers-loading">Loading reactions…</div> : commentReactionUsers.length === 0 ? <div className="followers-empty"><span>No reactions yet.</span></div> : <div className="followers-list">{commentReactionUsers.map((item) => <div className="follower-row" key={item.id}><button className="follower-identity" type="button" onClick={() => void loadPublicProfile(item.id)}><div className="avatar follower-avatar" style={item.profile.avatar_url ? { backgroundImage: `url(${item.profile.avatar_url})` } : undefined}>{!item.profile.avatar_url && initials(item.profile.display_name)}</div><span><strong>{item.profile.display_name}</strong><small>@{item.profile.username}</small><em>{commentReactionOptions.find((reaction) => reaction.type === item.reactionType)?.label ?? item.reactionType}</em></span></button></div>)}</div>}
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
            aria-label={activePostMedia.type === "video" ? "Video viewer" : "Image viewer"}            onClick={(event) => event.stopPropagation()}
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

            <div className="highlight-viewer-image">
              {activeHighlight.image_url ? (
                isVideoMedia(activeHighlight.image_url) ? (
                  <video
                    src={activeHighlight.image_url}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img src={activeHighlight.image_url} alt={activeHighlight.title} />
                )
              ) : (
                <Sparkles size={38} />
              )}
            </div>

            <div className="highlight-viewer-caption">
              <div className="highlight-viewer-caption-row">
                <div>
                  <strong id="active-highlight-title">
                    {activeHighlight.title}
                  </strong>
                  <span>RP WORLD highlight</span>
                </div>

                {!viewAs && (
                  <button
                    className="icon-button highlight-viewer-more"
                    type="button"
                    aria-label="Highlight options"
                    title="Highlight options"
                    onClick={() => setHighlightActionsOpen((open) => !open)}
                  >
                    <MoreVertical size={18} />
                  </button>
                )}
              </div>
            </div>

            {highlightActionsOpen && !viewAs && (
              <div className="highlight-actions-sheet" role="menu" aria-label="Highlight options">
                <button type="button" onClick={() => openHighlightEditor(activeHighlight)} disabled={highlightEditBusy}>
                  <Pencil size={16} /> Edit highlight title
                </button>
                <button type="button" onClick={() => highlightAddFileRef.current?.click()} disabled={highlightEditBusy}>
                  <Plus size={16} /> Add highlight photo
                </button>
                <button type="button" onClick={() => void removeHighlightMedia()} disabled={highlightEditBusy || !activeHighlight.image_url}>
                  <Trash2 size={16} /> Remove highlight photo
                </button>
                <button type="button" className="danger" onClick={() => void deleteHighlight()} disabled={highlightEditBusy}>
                  <Trash2 size={16} /> Delete entire highlight
                </button>
                <input
                  ref={highlightAddFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                  hidden
                  onChange={addHighlightMedia}
                />
              </div>
            )}
          </section>
        </div>
      )}

      {highlightEditOpen && activeHighlight && session && (
        <div className="sheet-backdrop" role="presentation">
          <section className="profile-sheet glass highlight-edit-sheet" role="dialog" aria-modal="true" aria-labelledby="highlight-edit-title">
            <div className="sheet-header">
              <div>
                <p className="eyebrow">HIGHLIGHT</p>
                <h2 id="highlight-edit-title">Edit highlight.</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close" onClick={() => setHighlightEditOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="auth-form" onSubmit={updateHighlight}>
              <label>
                <span>Title</span>
                <div className="input-wrap">
                  <Sparkles size={15} />
                  <input
                    type="text"
                    value={highlightEditTitle}
                    onChange={(event) => setHighlightEditTitle(event.target.value)}
                    maxLength={24}
                    required
                  />
                </div>
              </label>

              <label>
                <span>Photo or video <small>optional</small></span>
                <div className="input-wrap">
                  <Image size={15} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    onChange={(event) => setHighlightEditFile(event.target.files?.[0] ?? null)}
                  />
                </div>
              </label>

              {profileError && <p className="form-message error">{profileError}</p>}

              <button className="primary-button full" type="submit" disabled={highlightEditBusy}>
                {highlightEditBusy ? "Saving…" : "Save changes"}
              </button>

              <button
                className="secondary-button full highlight-delete-button"
                type="button"
                disabled={highlightEditBusy}
                onClick={() => {
                  setHighlightEditOpen(false);
                  setHighlightActionsOpen(false);
                  void deleteHighlight();
                }}
              >
                <Trash2 size={16} />
                Delete highlight
              </button>
            </form>
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