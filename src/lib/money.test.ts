import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/money";

describe("formatPrice", () => {
  it("formats whole rupees with thousands separators", () => {
    expect(formatPrice(1500)).toBe("Rs 1,500");
    expect(formatPrice(125000)).toBe("Rs 125,000");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("Rs 0");
  });

  it("rejects decimal amounts", () => {
    expect(() => formatPrice(1499.99)).toThrow();
  });

  it("rejects negative amounts", () => {
    expect(() => formatPrice(-100)).toThrow();
  });
});
