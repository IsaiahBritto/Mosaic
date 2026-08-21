"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEvent, deleteEvent, updateEvent } from "@/lib/actions/events";
import { getUserTimezone } from "@/lib/calendar/timezone";
import type { WritableCalendarOption } from "@/types/event";
import {
  eventFormSchema,
  type EventFormInput,
} from "@/lib/validation/event";
import { AppHeader } from "@/components/shell/AppHeader";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/events/DateInput";
import { getNextTimeSlot, TimeInput } from "@/components/events/TimeInput";
import { TimezoneSelect } from "@/components/events/TimezoneSelect";
import { RecurrenceFields } from "@/components/events/RecurrenceFields";
import { TravelTimeFields } from "@/components/events/TravelTimeFields";
import { CalendarSelect } from "@/components/events/CalendarSelect";
import { useToast } from "@/components/ui/Toast";

const FORM_ID = "event-form";

type EventFormProps = {
  mode: "create" | "edit";
  eventId?: string;
  defaultValues: EventFormInput;
  calendars: WritableCalendarOption[];
  exitHref: string;
  headerTitle: string;
};

export function EventForm({
  mode,
  eventId,
  defaultValues,
  calendars,
  exitHref,
  headerTitle,
}: EventFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(
    Boolean(defaultValues.recurrence),
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      ...defaultValues,
      timezone: defaultValues.timezone || getUserTimezone(),
    },
  });

  const isAllDay = watch("isAllDay");
  const calendarId = watch("calendarId");
  const recurrence = watch("recurrence");
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const startTime = watch("startTime");
  const endTime = watch("endTime");
  const travelBeforeMinutes = watch("travelBeforeMinutes");
  const travelAfterMinutes = watch("travelAfterMinutes");

  const isSameDay = startDate === endDate;

  useEffect(() => {
    if (!calendarId && calendars[0]) {
      setValue("calendarId", calendars[0].id);
    }
  }, [calendarId, calendars, setValue]);

  useEffect(() => {
    if (isAllDay || !isSameDay || !startTime || !endTime) {
      return;
    }

    if (endTime <= startTime) {
      const nextEndTime = getNextTimeSlot(startTime);
      if (nextEndTime) {
        setValue("endTime", nextEndTime, { shouldValidate: true });
      }
    }
  }, [endTime, isAllDay, isSameDay, setValue, startTime]);

  function handleExit() {
    if (isDirty && !window.confirm("Discard unsaved changes?")) {
      return;
    }
    router.push(exitHref);
  }

  function onSubmit(data: EventFormInput) {
    startTransition(async () => {
      const payload: EventFormInput = {
        ...data,
        recurrence: recurrenceEnabled ? data.recurrence ?? null : null,
      };

      const result =
        mode === "create"
          ? await createEvent(payload)
          : await updateEvent(eventId!, payload);

      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      showToast(mode === "create" ? "Event created" : "Event saved");
      router.push(exitHref);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!eventId) return;
    if (!window.confirm("Delete this event?")) return;

    startTransition(async () => {
      const result = await deleteEvent({ id: eventId });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Event deleted");
      router.push(exitHref);
      router.refresh();
    });
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <AppHeader
        title={headerTitle}
        exitHref={exitHref}
        onExit={handleExit}
        saveLabel={isPending ? "Saving…" : "Save"}
        saveFormId={FORM_ID}
      />

      <form
        id={FORM_ID}
        onSubmit={handleSubmit(onSubmit)}
        className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto px-4 py-4"
      >
        <Input
          label="Event Name/Title"
          {...register("title")}
          error={errors.title?.message}
          placeholder="Event title"
        />

        <Input
          label="Location"
          {...register("location")}
          error={errors.location?.message}
          placeholder="Location"
        />

        <div className="flex items-center justify-between border-y border-surface py-3">
          <span className="text-xs uppercase tracking-wide text-text-secondary">
            All Day
          </span>
          <Toggle
            checked={isAllDay}
            onChange={(checked) => setValue("isAllDay", checked, { shouldDirty: true })}
          />
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          {!isAllDay ? (
            <>
              <div className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden">
                <TimeInput
                  label="Start Time"
                  value={startTime}
                  onChange={(value) =>
                    setValue("startTime", value, { shouldDirty: true, shouldValidate: true })
                  }
                  error={errors.startTime?.message ?? errors.endDate?.message}
                />
                <DateInput
                  compact
                  label="Start Day"
                  {...register("startDate")}
                  error={errors.startDate?.message}
                />
              </div>
              <div className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden">
                <TimeInput
                  label="End Time"
                  value={endTime}
                  minTime={isSameDay ? startTime : undefined}
                  onChange={(value) =>
                    setValue("endTime", value, { shouldDirty: true, shouldValidate: true })
                  }
                  error={errors.endTime?.message ?? errors.endDate?.message}
                />
                <DateInput
                  compact
                  label="End Day"
                  {...register("endDate")}
                  error={errors.endDate?.message ?? errors.endTime?.message}
                />
              </div>
            </>
          ) : (
            <>
              <DateInput
                compact
                label="Start Day"
                {...register("startDate")}
                error={errors.startDate?.message}
              />
              <DateInput
                compact
                label="End Day"
                {...register("endDate")}
                error={errors.endDate?.message}
              />
            </>
          )}
        </div>

        <TimezoneSelect
          value={watch("timezone")}
          onChange={(value) =>
            setValue("timezone", value, { shouldDirty: true, shouldValidate: true })
          }
          error={errors.timezone?.message}
        />

        <div className="grid grid-cols-2 gap-4 border-t border-surface pt-4">
          <RecurrenceFields
            enabled={recurrenceEnabled}
            onEnabledChange={setRecurrenceEnabled}
            value={recurrence ?? null}
            onChange={(value) =>
              setValue("recurrence", value, { shouldDirty: true, shouldValidate: true })
            }
            error={errors.recurrence?.message}
          />
          <TravelTimeFields
            beforeMinutes={travelBeforeMinutes}
            afterMinutes={travelAfterMinutes}
            onBeforeChange={(minutes) =>
              setValue("travelBeforeMinutes", minutes, { shouldDirty: true })
            }
            onAfterChange={(minutes) =>
              setValue("travelAfterMinutes", minutes, { shouldDirty: true })
            }
          />
        </div>

        <CalendarSelect
          calendars={calendars}
          value={calendarId}
          onChange={(value) =>
            setValue("calendarId", value, { shouldDirty: true, shouldValidate: true })
          }
          error={errors.calendarId?.message}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-xs uppercase tracking-wide text-text-secondary">
            Notes
          </label>
          <textarea
            id="notes"
            {...register("notes")}
            rows={4}
            placeholder="Notes"
            className="w-full rounded-lg bg-surface px-3 py-2.5 text-sm text-text-primary outline-none ring-1 ring-transparent focus:ring-accent/50"
          />
          {errors.notes?.message ? (
            <p className="text-xs text-status-busy">{errors.notes.message}</p>
          ) : null}
        </div>

        <input type="hidden" {...register("isHoliday")} />

        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Saving…" : "Save Event"}
        </Button>

        {mode === "edit" ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isPending}
            onClick={handleDelete}
            className="text-status-busy"
          >
            Delete Event
          </Button>
        ) : null}
      </form>
    </div>
  );
}
