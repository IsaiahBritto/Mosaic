export type IntegrationProvider = "google" | "apple";

export type CalendarConnection = {
  id: string;
  userId: string;
  provider: IntegrationProvider;
  providerAccountId: string;
  providerAccountEmail: string;
  lastSyncAt: string | null;
  lastSyncStatus: "ok" | "error" | "syncing" | null;
  lastSyncError: string | null;
};

export type SyncResult = {
  connectionId: string;
  provider: IntegrationProvider;
  pulled: number;
  pushed: number;
  errors: string[];
};
