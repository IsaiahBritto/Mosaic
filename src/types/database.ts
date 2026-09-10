/**
 * Generated via: npm run db:types
 * Extended manually for integration columns until `supabase gen types` is re-run.
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
          source: string;
          connection_id: string | null;
          external_calendar_id: string | null;
          sync_enabled: boolean;
          external_sync_token: string | null;
          external_caldav_path: string | null;
          external_calendar_access_role: string | null;
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
          source: string;
          external_event_id: string | null;
          external_etag: string | null;
          external_updated_at: string | null;
          sync_status: string | null;
          external_metadata: Json | null;
          conflict_payload: Json | null;
        };
      };
      calendar_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          provider_account_id: string;
          provider_account_email: string;
          sync_lock_until: string | null;
          last_sync_at: string | null;
          last_sync_status: string | null;
          last_sync_error: string | null;
        };
      };
      user_preferences: {
        Row: {
          user_id: string;
          last_linked_sync_date: string | null;
        };
      };
      sync_log: {
        Row: {
          id: string;
          connection_id: string | null;
          direction: string | null;
          action: string | null;
          detail: Json | null;
          created_at: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
