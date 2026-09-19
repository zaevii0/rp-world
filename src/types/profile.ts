export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}
