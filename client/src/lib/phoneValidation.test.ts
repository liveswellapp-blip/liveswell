import { describe, it, expect } from "vitest";
import {
  isValidE164,
  normalizePhoneNumber,
  phoneBlurError,
  isVerifyButtonEnabled,
} from "./phoneValidation";

// ─── isValidE164 ─────────────────────────────────────────────────────────────

describe("isValidE164", () => {
  // ── Valid E.164 numbers ──────────────────────────────────────────────────
  it("accepts a US number (+1 area-code subscriber)", () => {
    expect(isValidE164("+15551234567")).toBe(true);
  });

  it("accepts a UK number", () => {
    expect(isValidE164("+447911123456")).toBe(true);
  });

  it("accepts an Australian number", () => {
    expect(isValidE164("+61412345678")).toBe(true);
  });

  it("accepts a Brazilian number (country code 55)", () => {
    expect(isValidE164("+5511987654321")).toBe(true);
  });

  it("accepts the minimum valid length (8 chars total: + and 7 digits)", () => {
    // Some small countries have 7-digit local numbers; +country(1) + 6 digits = 8 chars
    expect(isValidE164("+1234567")).toBe(true);
  });

  it("accepts the maximum valid length (15 chars total)", () => {
    expect(isValidE164("+123456789012345")).toBe(true); // +1 + 14 digits
  });

  // ── Switching country then entering a valid local number (task core case) ─
  it("accepts a number after switching from US to UK and entering a valid local number", () => {
    // react-phone-number-input outputs this when user selects GB and types 07911123456
    const ukNumber = "+447911123456";
    expect(isValidE164(ukNumber)).toBe(true);
  });

  it("accepts a number after switching from US to Germany and entering a valid local number", () => {
    // react-phone-number-input outputs this when user selects DE and types 01711234567
    const deNumber = "+4917112345678";
    expect(isValidE164(deNumber)).toBe(true);
  });

  // ── Incomplete / invalid numbers ─────────────────────────────────────────
  it("rejects an empty string", () => {
    expect(isValidE164("")).toBe(false);
  });

  it("rejects a number with no leading plus", () => {
    expect(isValidE164("15551234567")).toBe(false);
  });

  it("rejects a number that is too short (fewer than 7 total digits)", () => {
    // Library returns undefined for incomplete numbers; handlePhoneChange coerces to ""
    // but if somehow a short string reaches isValidE164 it must be rejected
    expect(isValidE164("+15551")).toBe(false);   // + + 1 + 4 digits = 6 chars, below minimum
    expect(isValidE164("+1555")).toBe(false);    // + + 1 + 3 digits = 5 chars
  });

  it("rejects a number that is too long (16+ chars)", () => {
    expect(isValidE164("+1234567890123456")).toBe(false); // 16 chars
  });

  it("rejects a number where the first digit after + is 0", () => {
    expect(isValidE164("+0441234567890")).toBe(false);
  });

  it("rejects non-digit characters in the number", () => {
    expect(isValidE164("+1 555 123 4567")).toBe(false);
    expect(isValidE164("+1-555-123-4567")).toBe(false);
  });

  it("rejects just a plus sign", () => {
    expect(isValidE164("+")).toBe(false);
  });

  it("rejects undefined coerced to empty string (library output when number is incomplete)", () => {
    // handlePhoneChange does:  const safe = val ?? "";
    // so the component always passes a string — but the string may be ""
    expect(isValidE164("")).toBe(false);
  });
});

// ─── normalizePhoneNumber ─────────────────────────────────────────────────────

describe("normalizePhoneNumber", () => {
  it("passes through an already-E.164 number unchanged", () => {
    expect(normalizePhoneNumber("+15551234567")).toBe("+15551234567");
  });

  it("converts a 10-digit US number to E.164", () => {
    expect(normalizePhoneNumber("5551234567")).toBe("+15551234567");
  });

  it("converts an 11-digit US number (leading 1) to E.164", () => {
    expect(normalizePhoneNumber("15551234567")).toBe("+15551234567");
  });

  it("strips dashes before converting", () => {
    expect(normalizePhoneNumber("555-123-4567")).toBe("+15551234567");
  });

  it("strips spaces and parentheses before converting", () => {
    expect(normalizePhoneNumber("(555) 123 4567")).toBe("+15551234567");
  });

  it("passes through unknown formats unchanged", () => {
    // 9-digit number — server must validate
    expect(normalizePhoneNumber("123456789")).toBe("123456789");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizePhoneNumber("  +15551234567  ")).toBe("+15551234567");
  });
});

// ─── phoneBlurError ───────────────────────────────────────────────────────────

describe("phoneBlurError", () => {
  it("returns no error for an empty string (field not yet filled)", () => {
    expect(phoneBlurError("")).toBe("");
  });

  it("returns no error for a valid E.164 number", () => {
    expect(phoneBlurError("+15551234567")).toBe("");
  });

  it("returns no error for a valid UK number", () => {
    expect(phoneBlurError("+447911123456")).toBe("");
  });

  it("returns an error message for an incomplete US number", () => {
    // +1 + only 4 digits = 6 chars total, below the 8-char minimum E.164 floor
    expect(phoneBlurError("+15551")).toBe("Looks like an incomplete number");
  });

  it("returns an error message for a number missing the plus prefix", () => {
    expect(phoneBlurError("5551234567")).toBe("Looks like an incomplete number");
  });

  it("returns an error message for a number with spaces (not E.164)", () => {
    expect(phoneBlurError("+1 555 123 4567")).toBe("Looks like an incomplete number");
  });

  it("clears the error when the user corrects an incomplete number to a valid one", () => {
    // Simulate: blur with short number → error; then blur again after completing it
    expect(phoneBlurError("+15551")).toBe("Looks like an incomplete number");
    expect(phoneBlurError("+15551234567")).toBe("");
  });
});

// ─── isVerifyButtonEnabled ────────────────────────────────────────────────────

describe("isVerifyButtonEnabled (mirrors Verify button disabled logic)", () => {
  // isVerifyButtonEnabled uses isValidE164 internally, so the button is only
  // enabled when the phone number is a complete E.164 string — not just nonempty.
  const base = {
    phoneNumber: "+15551234567",
    smsConsent: true,
    isSendingCode: false,
  };

  it("is enabled when all conditions are met", () => {
    expect(isVerifyButtonEnabled(base)).toBe(true);
  });

  it("is disabled when phoneNumber is empty (incomplete number / library returned undefined)", () => {
    expect(isVerifyButtonEnabled({ ...base, phoneNumber: "" })).toBe(false);
  });

  it("is disabled when phoneNumber is whitespace only", () => {
    expect(isVerifyButtonEnabled({ ...base, phoneNumber: "   " })).toBe(false);
  });

  it("is disabled when the number is present but too short to be valid E.164", () => {
    // e.g. user typed 4 digits after switching country — library returns partial
    expect(isVerifyButtonEnabled({ ...base, phoneNumber: "+15551" })).toBe(false);
  });

  it("is disabled when SMS consent checkbox is unchecked", () => {
    expect(isVerifyButtonEnabled({ ...base, smsConsent: false })).toBe(false);
  });

  it("is disabled while a code send is in progress", () => {
    expect(isVerifyButtonEnabled({ ...base, isSendingCode: true })).toBe(false);
  });

  // ── Switching country scenario ────────────────────────────────────────────
  it("is enabled after switching country and entering a complete UK local number", () => {
    // User switches picker to GB, types 07911123456; library outputs +447911123456
    expect(
      isVerifyButtonEnabled({
        phoneNumber: "+447911123456",
        smsConsent: true,
        isSendingCode: false,
      })
    ).toBe(true);
  });

  it("is disabled after switching country if the number typed is still incomplete", () => {
    // User switches picker to AU but only typed 4 digits; library outputs "" / undefined
    expect(
      isVerifyButtonEnabled({
        phoneNumber: "",
        smsConsent: true,
        isSendingCode: false,
      })
    ).toBe(false);
  });

  it("is disabled when an incomplete German number is entered after country switch", () => {
    // User switched to DE, typed only 4 digits — the number is present but not E.164
    expect(
      isVerifyButtonEnabled({
        phoneNumber: "+4917",
        smsConsent: true,
        isSendingCode: false,
      })
    ).toBe(false);
  });
});
