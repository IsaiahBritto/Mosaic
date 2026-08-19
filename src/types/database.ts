/**
 * Generated via: npm run db:types
 * Replace with output from `supabase gen types typescript --linked` after linking your project.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      calendars: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          color_hex: string;
          type: string;
          is_visible_default: boolean;
          created_at: string;
        };
      };
      events: {
        Row: {
          id: string;
          calendar_id: string;
          created_by: string;
          title: string;
          start_at: string;
          end_at: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
