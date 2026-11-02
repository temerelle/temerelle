import { describe, expect, it } from "vitest";
import { formatPrice, parsePrice, priceInputValue } from "@/lib/money";

describe("money", () => {
  it("formats kopiyky as hryvnias", () => {
    expect(formatPrice(50000)).toBe("500 ₴");
    expect(formatPrice(59950)).toBe("599,5 ₴");
    expect(formatPrice(0)).toBe("0 ₴");
  });

  it("parses what people type, comma or dot", () => {
    expect(parsePrice("600")).toBe(60000);
    expect(parsePrice("599,50")).toBe(59950);
    expect(parsePrice(" 1 200.5 ")).toBe(120050);
    expect(parsePrice("0.1")).toBe(10);
  });

  it("refuses what isn't a price", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1,2,3", "10000000"]) expect(parsePrice(bad)).toBeNull();
  });

  it("an input value round-trips", () => {
    expect(parsePrice(priceInputValue(59950))).toBe(59950);
  });
});
