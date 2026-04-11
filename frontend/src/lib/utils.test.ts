import { describe, it, expect } from "vitest";
import { formatCpf } from "./utils";

describe("formatCpf", () => {
  it("formats 11 digits to CPF mask", () => {
    expect(formatCpf("12345678909")).toBe("123.456.789-09");
  });

  it("returns digits only if less than 11", () => {
    expect(formatCpf("123")).toBe("123");
  });

  it("strips non-digits before formatting", () => {
    expect(formatCpf("123.456.789-09")).toBe("123.456.789-09");
  });
});
