const INTEGRATION_ERRORS: Record<string, string> = {
  google_not_configured:
    "Google sync isn't set up yet. Check server configuration.",
  google_auth_failed: "Google sign-in was cancelled.",
  google_token_failed: "Couldn't save Google connection. Check encryption key.",
  token_revoked: "Google or iCloud access expired. Reconnect your account.",
  apple_invalid_credentials:
    "Apple ID or app-specific password is incorrect. See the setup guide.",
  sync_in_progress: "Sync already running. Please wait.",
  invalid_state: "OAuth session expired. Try connecting again.",
  google_account_mismatch:
    "That Google account doesn't match the linked connection. Reconnect with the same account.",
};

export function integrationErrorMessage(
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  return INTEGRATION_ERRORS[code] ?? code;
}
