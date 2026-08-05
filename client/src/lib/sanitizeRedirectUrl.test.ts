import { describe, it, expect } from "vitest";
import { sanitizeRedirectUrl } from "./sanitizeRedirectUrl";

describe("sanitizeRedirectUrl", () => {
  it("allows a plain relative path", () => {
    expect(sanitizeRedirectUrl("/conditions")).toBe("/conditions");
  });

  it("allows a relative path with a query string", () => {
    expect(sanitizeRedirectUrl("/conditions?location=123")).toBe("/conditions?location=123");
  });

  it("allows nested relative paths", () => {
    expect(sanitizeRedirectUrl("/settings/profile")).toBe("/settings/profile");
  });

  it("rejects an https URL", () => {
    expect(sanitizeRedirectUrl("https://evil.com")).toBe("/");
  });

  it("rejects an http URL", () => {
    expect(sanitizeRedirectUrl("http://evil.com/steal")).toBe("/");
  });

  it("rejects a protocol-relative URL (double slash)", () => {
    expect(sanitizeRedirectUrl("//evil.com")).toBe("/");
  });

  it("rejects a bare domain without protocol", () => {
    expect(sanitizeRedirectUrl("evil.com/path")).toBe("/");
  });

  it("rejects an empty string", () => {
    expect(sanitizeRedirectUrl("")).toBe("/");
  });

  it("returns '/' unchanged", () => {
    expect(sanitizeRedirectUrl("/")).toBe("/");
  });
});
