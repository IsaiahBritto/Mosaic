import { describe, expect, it } from "vitest";
import { createCalendarSchema } from "@/lib/validation/calendar";

describe("createCalendarSchema", () => {
  it("accepts valid palette color", () => {
    const result = createCalendarSchema.safeParse({
      name: "Dance",
      colorHex: "#9379E0",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid color hex", () => {
    const result = createCalendarSchema.safeParse({
      name: "Dance",
      colorHex: "#000000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createCalendarSchema.safeParse({
      name: "",
      colorHex: "#9379E0",
    });
    expect(result.success).toBe(false);
  });
});
