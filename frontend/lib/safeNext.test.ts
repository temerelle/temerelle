import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safeNext";

describe("safeNext", () => {
  it("keeps a path on this site", () => {
    expect(safeNext("/profile")).toBe("/profile");
    expect(safeNext("/b/salon-1?x=1")).toBe("/b/salon-1?x=1");
  });

  it("refuses anything that leaves the site", () => {
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });

  it("no value: the fallback", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined, "/profile")).toBe("/profile");
  });
});
