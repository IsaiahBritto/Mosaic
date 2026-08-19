/** Feature flags for phased rollout of integrations and UI sections. */
export const features = {
  linkedGoogleCalendars:
    process.env.NEXT_PUBLIC_FEATURE_GOOGLE === "true",
  linkedAppleCalendars:
    process.env.NEXT_PUBLIC_FEATURE_APPLE === "true",
  /** Show disabled LINKED section placeholders until Phase 7/8. */
  showLinkedCalendarStubs:
    process.env.NEXT_PUBLIC_FEATURE_GOOGLE !== "true" &&
    process.env.NEXT_PUBLIC_FEATURE_APPLE !== "true",
} as const;
