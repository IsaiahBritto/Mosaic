import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

vi.mock("@/lib/repositories/calendars.repository", () => ({
  fetchCalendarById: vi.fn(),
  countOwnedCalendars: vi.fn(),
  deleteCalendarById: vi.fn(),
}));

import {
  fetchCalendarById,
  countOwnedCalendars,
} from "@/lib/repositories/calendars.repository";
import { deleteCalendarForUser } from "@/lib/services/calendar.service";

describe("deleteCalendarForUser", () => {
  it("blocks deleting the last owned calendar", async () => {
    vi.mocked(fetchCalendarById).mockResolvedValue({
      id: "cal-1",
      owner_id: "user-1",
      type: "native",
    });
    vi.mocked(countOwnedCalendars).mockResolvedValue(1);

    const supabase = {} as never;

    await expect(
      deleteCalendarForUser(supabase, "user-1", "cal-1"),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "You must keep at least one calendar",
    } satisfies Partial<AppError>);
  });
});
