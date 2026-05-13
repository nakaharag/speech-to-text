/**
 * Apple Sign In helper utilities
 */

/**
 * Checks if an email is an Apple private relay email
 * Format: xyz123@privaterelay.appleid.com
 */
export function isApplePrivateRelay(email: string): boolean {
  return email.endsWith('@privaterelay.appleid.com');
}

/**
 * Apple's private relay emails are unique per app per user.
 * They forward to the user's real email but we can't know what that is.
 * We should treat them as valid emails but flag them for support purposes.
 */
export function normalizeAppleEmail(email: string): string {
  return email.toLowerCase().trim();
}
