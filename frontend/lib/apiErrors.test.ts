import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { DEFAULT_ERROR, ERROR_TEXT, errorText } from "@/lib/apiErrors";

// As lib/api.ts throws it: body { code, message }
const coded = (code: string, message = "English text") => new ApiError(message, 409, { code, message });

describe("errorText", () => {
  it("shows the text for the code", () => {
    expect(errorText(coded("BOOKING_CONFLICT"))).toBe("Цей час уже зайняли. Оберіть інший.");
  });

  it("goes by the code, not the English message: a reworded message changes nothing", () => {
    expect(errorText(coded("BOOKING_CONFLICT", "Someone booked this time first"))).toBe(
      "Цей час уже зайняли. Оберіть інший.",
    );
  });

  it("never shows the backend's English: no code or an unknown one gets the fallback", () => {
    expect(errorText(new ApiError("Not found", 404, { message: "Not found" }))).toBe(DEFAULT_ERROR);
    expect(errorText(coded("SOMETHING_NEW"), "Помилка входу.")).toBe("Помилка входу.");
    expect(errorText(coded("constructor"))).toBe(DEFAULT_ERROR);
  });

  it("a network failure or something that is not an ApiError gets the fallback", () => {
    expect(errorText(new TypeError("Failed to fetch"))).toBe(DEFAULT_ERROR);
    expect(errorText(new Error("Time is already taken"))).toBe(DEFAULT_ERROR);
    expect(errorText("boom")).toBe(DEFAULT_ERROR);
    expect(errorText(undefined, "Не вдалося зберегти.")).toBe("Не вдалося зберегти.");
  });

  it("a place can word the same error its own way", () => {
    const own = { BOOKING_CONFLICT: "Хтось записався раніше" };
    expect(errorText(coded("BOOKING_CONFLICT"), "Не вдалося", own)).toBe("Хтось записався раніше");
  });
});

// Every backend code has a text here, and nothing here is stale
describe("error codes match the backend", () => {
  const catalog = readFileSync(resolve(__dirname, "../../backend/src/common/api-error.ts"), "utf8");
  const backendCodes = [...catalog.matchAll(/^\s+([A-Z_]+): '/gm)].map((m) => m[1]).sort();

  it("the backend list is read", () => {
    expect(backendCodes.length).toBeGreaterThan(0);
  });

  it("the same codes on both sides", () => {
    expect(Object.keys(ERROR_TEXT).sort()).toEqual(backendCodes);
  });
});
