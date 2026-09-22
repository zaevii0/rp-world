export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  cover_url: string | null;
  highlight_style: "circle" | "portrait";
  rp_id: string;
  theme_id: string;
  profile_visibility: "public" | "private";
  verified_until: string | null;
  themes_until: string | null;
  created_at: string;
  updated_at: string;
}
