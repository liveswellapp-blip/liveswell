// @vitest-environment jsdom

/**
 * Component tests for PhoneInputField.
 *
 * These tests render the real react-phone-number-input widget inside jsdom so
 * that we can confirm:
 *   - the initial onChange is called with a US-formatted E.164 value
 *   - switching country then entering a local number produces a valid E.164 string
 *   - an incomplete number (too few digits) keeps onChange receiving "" or a
 *     non-E.164 value that isValidE164 rejects (disabling the Verify button)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhoneInputField } from "./PhoneInputField";
import { isValidE164 } from "../lib/phoneValidation";

// ── helpers ─────────────────────────────────────────────────────────────────

function setup(initialValue = "") {
  const onChange = vi.fn();
  const onBlur = vi.fn();
  const { container } = render(
    <PhoneInputField value={initialValue} onChange={onChange} onBlur={onBlur} />
  );
  // The hidden <select> that react-phone-number-input uses for the country picker
  const countrySelect = container.querySelector(
    ".PhoneInputCountrySelect"
  ) as HTMLSelectElement;
  // The visible <input> for the local number
  const numberInput = container.querySelector(
    ".PhoneInputInput"
  ) as HTMLInputElement;
  return { onChange, onBlur, countrySelect, numberInput };
}

// ── basic rendering ──────────────────────────────────────────────────────────

describe("PhoneInputField rendering", () => {
  it("renders a phone number input", () => {
    const { numberInput } = setup();
    expect(numberInput).toBeTruthy();
  });

  it("renders a country select for the flag picker", () => {
    const { countrySelect } = setup();
    expect(countrySelect).toBeTruthy();
  });

  it("defaults to United States (US)", () => {
    const { countrySelect } = setup();
    expect(countrySelect.value).toBe("US");
  });
});

// ── US number entry ──────────────────────────────────────────────────────────

describe("PhoneInputField – US number entry", () => {
  it("calls onChange with a valid E.164 US number after typing 10 digits", async () => {
    const user = userEvent.setup();
    const { onChange, numberInput } = setup();

    await user.click(numberInput);
    await user.type(numberInput, "5551234567");

    // Find the last call that produced a non-empty E.164 string
    const e164Calls = onChange.mock.calls
      .map((args: any[]) => args[0] as string)
      .filter((v: string) => v.startsWith("+"));

    expect(e164Calls.length).toBeGreaterThan(0);
    const last = e164Calls[e164Calls.length - 1];
    expect(isValidE164(last)).toBe(true);
    expect(last).toBe("+15551234567");
  });

  it("calls onChange with '' when the field is cleared (incomplete number rejected)", async () => {
    const user = userEvent.setup();
    const { onChange, numberInput } = setup("+15551234567");

    // Clear the number input
    await user.tripleClick(numberInput);
    await user.keyboard("{Backspace}");

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    // Library returns undefined → component coerces to ""
    expect(lastCall[0]).toBe("");
    expect(isValidE164(lastCall[0])).toBe(false);
  });
});

// ── Country-switch → E.164 (core task requirement) ───────────────────────────

describe("PhoneInputField – country switch produces correct E.164", () => {
  it("after switching to GB and entering a UK local number, onChange receives a valid UK E.164", async () => {
    const user = userEvent.setup();
    const { onChange, countrySelect, numberInput } = setup();

    // 1. Switch country to United Kingdom
    await act(async () => {
      fireEvent.change(countrySelect, { target: { value: "GB" } });
    });
    expect(countrySelect.value).toBe("GB");

    // 2. Type UK local number (without leading 0 — library handles the trunk prefix)
    await user.click(numberInput);
    await user.type(numberInput, "7911123456");

    // 3. Find the last valid E.164 call
    const e164Calls = onChange.mock.calls
      .map((args: any[]) => args[0] as string)
      .filter((v: string) => typeof v === "string" && v.startsWith("+44"));

    expect(e164Calls.length).toBeGreaterThan(0);
    const last = e164Calls[e164Calls.length - 1];
    expect(isValidE164(last)).toBe(true);
    expect(last).toBe("+447911123456");
  });

  it("after switching to AU and entering an Australian mobile, onChange receives a valid AU E.164", async () => {
    const user = userEvent.setup();
    const { onChange, countrySelect, numberInput } = setup();

    await act(async () => {
      fireEvent.change(countrySelect, { target: { value: "AU" } });
    });
    expect(countrySelect.value).toBe("AU");

    await user.click(numberInput);
    await user.type(numberInput, "412345678");

    const e164Calls = onChange.mock.calls
      .map((args: any[]) => args[0] as string)
      .filter((v: string) => typeof v === "string" && v.startsWith("+61"));

    expect(e164Calls.length).toBeGreaterThan(0);
    const last = e164Calls[e164Calls.length - 1];
    expect(isValidE164(last)).toBe(true);
    expect(last).toBe("+61412345678");
  });

  it("after switching country, an incomplete number leaves onChange with a non-E.164 value (Verify button stays disabled)", async () => {
    const user = userEvent.setup();
    const { onChange, countrySelect, numberInput } = setup();

    // Switch to Germany
    await act(async () => {
      fireEvent.change(countrySelect, { target: { value: "DE" } });
    });

    // Type only 3 digits — not enough for a valid German mobile
    await user.click(numberInput);
    await user.type(numberInput, "171");

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    const lastValue: string = lastCall[0];
    // The library either returns "" (undefined coerced) or a partial string — both fail isValidE164
    expect(isValidE164(lastValue)).toBe(false);
  });
});

// ── onBlur wiring ────────────────────────────────────────────────────────────

describe("PhoneInputField – onBlur wiring", () => {
  it("calls the onBlur prop when the input loses focus", async () => {
    const user = userEvent.setup();
    const { onBlur, numberInput } = setup();

    await user.click(numberInput);
    await user.tab(); // move focus away

    expect(onBlur).toHaveBeenCalled();
  });
});
