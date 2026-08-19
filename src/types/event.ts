export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  intervalCount: number;
  daysOfWeek: number[];
  endDate: string | null;
};

export type Event = {
  id: string;
  calendarId: string;
  calendarColor: string;
  calendarName: string;
  title: string;
  location: string | null;
  notes: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  timezone: string;
  travelBeforeMinutes: number;
  travelAfterMinutes: number;
  isHoliday: boolean;
  recurrence: RecurrenceRule | null;
};

export type EventInstance = Event & {
  instanceId: string;
  masterEventId: string;
};

export type WritableCalendarOption = {
  id: string;
  name: string;
  colorHex: string;
};
