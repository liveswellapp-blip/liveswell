/**
 * Phone number validation and normalisation helpers.
 * Extracted here so they can be unit-tested independently of the React
 * component tree (react-phone-number-input outputs E.164 strings directly;
 * these helpers validate / coerce whatever ends up in form state).
 */

/**
 * Returns true when `s` is a plausible E.164 phone number:
 *   + followed by a non-zero leading digit and 6–14 more digits (total 8–15 chars).
 *
 * react-phone-number-input outputs exactly this format when the user has
 * entered a complete local number for the selected country dial-code.
 * An undefined/empty value (returned when the number is incomplete) is
 * explicitly rejected.
 */
export function isValidE164(s: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(s);
}

/**
 * Converts common US phone formats to E.164 before sending to the server.
 * react-phone-number-input already outputs E.164, so this is a safety net for
 * any value that bypasses the component (e.g. pasted into a plain text field).
 */
export function normalizePhoneNumber(raw: string): string {
  const s = raw.trim();
  if (s.startsWith("+")) return s; // already E.164 or international — pass through
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return s; // unknown format — let the server validate
}

/**
 * Derives the phone-field error message from the current value.
 * Mirrors the logic inside `handlePhoneBlur` in NotificationSettings.
 *
 * Returns an error string when the number is present but not valid E.164,
 * or an empty string when there is no error (empty field is also fine here —
 * the required-field check happens at save time).
 */
export function phoneBlurError(value: string): string {
  const final = value.trim();
  if (final && !isValidE164(final)) {
    return "Looks like an incomplete number";
  }
  return "";
}

/**
 * Returns true when the Verify / Send-code button should be enabled.
 * Mirrors the `disabled` condition on the button in NotificationSettings:
 *   !isSendingCode && isValidE164(phoneNumber) && smsConsent
 *
 * Using isValidE164 here (rather than a nonempty-string check) means the
 * button stays disabled for any value the library emits that isn't a fully-
 * formed E.164 string — including empty strings from incomplete numbers and
 * partial strings from a mid-entry country switch.
 */
export function isVerifyButtonEnabled({
  phoneNumber,
  smsConsent,
  isSendingCode,
}: {
  phoneNumber: string;
  smsConsent: boolean;
  isSendingCode: boolean;
}): boolean {
  return !isSendingCode && isValidE164(phoneNumber) && smsConsent;
}
