import PhoneInput from "react-phone-number-input";
import type { Value as PhoneValue } from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface PhoneInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  hasError?: boolean;
  placeholder?: string;
}

/**
 * Dark-themed phone input with flag + dial-code country picker.
 * Outputs E.164 strings (e.g. "+15551234567") via onChange.
 * Defaults to US (+1).
 */
export function PhoneInputField({
  value,
  onChange,
  onBlur,
  disabled,
  hasError,
  placeholder = "Local phone number",
}: PhoneInputFieldProps) {
  const borderColor = hasError
    ? "rgba(239,68,68,0.6)"
    : "rgba(255,255,255,0.1)";
  const shadow = hasError ? "0 0 0 1px rgba(239,68,68,0.25)" : undefined;

  return (
    <>
      <style>{`
        /* ── Container ── */
        .dark-phone-input.PhoneInput {
          display: flex;
          align-items: center;
          background: rgba(0,0,0,0.4);
          border: 1px solid ${borderColor};
          ${shadow ? `box-shadow: ${shadow};` : ""}
          border-radius: 0.75rem;
          height: 2.25rem;
          padding: 0 0.75rem;
          gap: 0.5rem;
          flex: 1;
          transition: border-color 0.15s;
        }
        .dark-phone-input.PhoneInput:focus-within {
          outline: none;
          box-shadow: 0 0 0 1px rgba(16,185,129,0.4)${shadow ? `, ${shadow}` : ""};
          border-color: rgba(16,185,129,0.5);
        }

        /* ── Country select button ── */
        .dark-phone-input .PhoneInputCountry {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          cursor: pointer;
          flex-shrink: 0;
        }
        .dark-phone-input .PhoneInputCountrySelect {
          position: absolute;
          opacity: 0;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          cursor: pointer;
          z-index: 1;
          font-size: 13px;
        }
        .dark-phone-input .PhoneInputCountrySelectArrow {
          color: rgba(148,163,184,0.7);
          border-color: rgba(148,163,184,0.7);
          width: 5px;
          height: 5px;
          margin-top: -2px;
        }
        .dark-phone-input .PhoneInputCountryIcon {
          width: 22px;
          height: 16px;
          border-radius: 2px;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.15);
        }
        .dark-phone-input .PhoneInputCountryIcon--border {
          background: transparent;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.15);
        }
        .dark-phone-input .PhoneInputCountryIcon svg {
          display: block;
        }

        /* ── Number input ── */
        .dark-phone-input .PhoneInputInput {
          background: transparent;
          border: none;
          outline: none;
          color: #e2e8f0;
          font-size: 13px;
          flex: 1;
          min-width: 0;
          padding: 0;
          height: 100%;
        }
        .dark-phone-input .PhoneInputInput::placeholder {
          color: rgba(148,163,184,0.5);
        }
        .dark-phone-input .PhoneInputInput:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
      <PhoneInput
        className="dark-phone-input"
        international
        defaultCountry="US"
        value={value as PhoneValue}
        onChange={(val) => onChange(val ?? "")}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
      />
    </>
  );
}
