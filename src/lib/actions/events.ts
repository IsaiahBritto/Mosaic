"use server";

import { revalidatePath } from "next/cache";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions/types";
import { isAppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  createEventForUser,
  deleteEventForUser,
  getEventForUser,
  rescheduleEventTimes,
  updateEventForUser,
} from "@/lib/services/event.service";
import type { Event } from "@/types/event";
import {
  deleteEventSchema,
  eventFormSchema,
  rescheduleEventSchema,
  type EventFormInput,
  type RescheduleEventInput,
} from "@/lib/validation/event";

function revalidateEventViews() {
  revalidatePath("/month");
  revalidatePath("/day");
  revalidatePath("/year");
  revalidatePath("/events/new");
}

async function getUserIdOrError(): Promise<
  ActionResult<never> | { userId: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  return { userId: user.id };
}

function isAuthError(
  result: ActionResult<never> | { userId: string },
): result is ActionResult<never> {
  return "success" in result && result.success === false;
}

export async function createEvent(
  input: EventFormInput,
): Promise<ActionResult<Event>> {
  const parsed = eventFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const auth = await getUserIdOrError();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = await createClient();
    const event = await createEventForUser(supabase, auth.userId, parsed.data);
    revalidateEventViews();
    return actionSuccess(event);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to create event",
    );
  }
}

export async function updateEvent(
  id: string,
  input: EventFormInput,
): Promise<ActionResult<Event>> {
  const parsed = eventFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const auth = await getUserIdOrError();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = await createClient();
    const event = await updateEventForUser(
      supabase,
      auth.userId,
      id,
      parsed.data,
    );
    revalidateEventViews();
    revalidatePath(`/events/${id}`);
    return actionSuccess(event);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to update event",
    );
  }
}

export async function deleteEvent(input: {
  id: string;
}): Promise<ActionResult<null>> {
  const parsed = deleteEventSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const auth = await getUserIdOrError();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = await createClient();
    await deleteEventForUser(supabase, auth.userId, parsed.data.id);
    revalidateEventViews();
    return actionSuccess(null);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to delete event",
    );
  }
}

export async function getEvent(id: string): Promise<ActionResult<Event>> {
  const auth = await getUserIdOrError();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = await createClient();
    const event = await getEventForUser(supabase, auth.userId, id);
    return actionSuccess(event);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to load event",
    );
  }
}

export async function rescheduleEvent(
  input: RescheduleEventInput,
): Promise<ActionResult<Event>> {
  const parsed = rescheduleEventSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const auth = await getUserIdOrError();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = await createClient();
    const event = await rescheduleEventTimes(
      supabase,
      auth.userId,
      parsed.data,
    );
    revalidateEventViews();
    revalidatePath(`/events/${parsed.data.eventId}`);
    return actionSuccess(event);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to reschedule event",
    );
  }
}
