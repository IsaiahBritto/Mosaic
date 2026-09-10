import type { GoogleCalendarListItem } from "@/lib/integrations/sync-types";

const BASE = "https://www.googleapis.com/calendar/v3";

type GoogleEvent = {
  id?: string;
  etag?: string;
  status?: string;
  summary?: string;
  location?: string;
  description?: string;
  updated?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
};

export class GoogleCalendarClient {
  constructor(private accessToken: string) {}

  private async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<{ data: T; status: number }> {
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (response.status === 204) {
      return { data: {} as T, status: response.status };
    }

    const text = await response.text();
    const data = text ? (JSON.parse(text) as T) : ({} as T);
    return { data, status: response.status };
  }

  async listCalendars(): Promise<GoogleCalendarListItem[]> {
    const items: GoogleCalendarListItem[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({ maxResults: "250" });
      if (pageToken) params.set("pageToken", pageToken);

      const { data, status } = await this.request<{
        items?: Array<{
          id: string;
          summary: string;
          backgroundColor?: string;
          accessRole: string;
          primary?: boolean;
          selected?: boolean;
        }>;
        nextPageToken?: string;
      }>(`/users/me/calendarList?${params}`);

      if (status >= 400) {
        throw new Error("Failed to list Google calendars");
      }

      for (const item of data.items ?? []) {
        items.push({
          id: item.id,
          summary: item.summary,
          backgroundColor: item.backgroundColor,
          accessRole: item.accessRole,
          primary: item.primary,
          selected: item.selected,
        });
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    return items;
  }

  async listEvents(
    calendarId: string,
    options: {
      syncToken?: string;
      timeMin?: string;
      timeMax?: string;
      pageToken?: string;
    },
  ): Promise<{
    events: GoogleEvent[];
    nextSyncToken?: string;
    nextPageToken?: string;
    fullSyncRequired: boolean;
  }> {
    const params = new URLSearchParams({
      singleEvents: "true",
      showDeleted: "true",
      maxResults: "250",
    });

    if (options.syncToken) {
      params.set("syncToken", options.syncToken);
    } else {
      if (options.timeMin) params.set("timeMin", options.timeMin);
      if (options.timeMax) params.set("timeMax", options.timeMax);
    }
    if (options.pageToken) params.set("pageToken", options.pageToken);

    const encodedCal = encodeURIComponent(calendarId);
    const response = await fetch(`${BASE}/calendars/${encodedCal}/events?${params}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (response.status === 410) {
      return { events: [], fullSyncRequired: true };
    }

    if (!response.ok) {
      throw new Error(`Google events.list failed (${response.status})`);
    }

    const data = (await response.json()) as {
      items?: GoogleEvent[];
      nextSyncToken?: string;
      nextPageToken?: string;
    };

    return {
      events: data.items ?? [],
      nextSyncToken: data.nextSyncToken,
      nextPageToken: data.nextPageToken,
      fullSyncRequired: false,
    };
  }

  async createEvent(
    calendarId: string,
    body: Record<string, unknown>,
  ): Promise<GoogleEvent> {
    const encodedCal = encodeURIComponent(calendarId);
    const { data, status } = await this.request<GoogleEvent>(
      `/calendars/${encodedCal}/events`,
      { method: "POST", body: JSON.stringify(body) },
    );
    if (status >= 400) throw new Error("Failed to create Google event");
    return data;
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    body: Record<string, unknown>,
  ): Promise<GoogleEvent> {
    const encodedCal = encodeURIComponent(calendarId);
    const encodedEvent = encodeURIComponent(eventId);
    const { data, status } = await this.request<GoogleEvent>(
      `/calendars/${encodedCal}/events/${encodedEvent}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    if (status >= 400) throw new Error("Failed to update Google event");
    return data;
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    const encodedCal = encodeURIComponent(calendarId);
    const encodedEvent = encodeURIComponent(eventId);
    const { status } = await this.request<unknown>(
      `/calendars/${encodedCal}/events/${encodedEvent}`,
      { method: "DELETE" },
    );
    if (status >= 400 && status !== 404) {
      throw new Error("Failed to delete Google event");
    }
  }
}

export type { GoogleEvent };
