// Prices travel as kopiyky (integers); people see and type hryvnias

const formatter = new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// 50000 → "500 ₴", 59950 → "599,5 ₴"
export function formatPrice(priceMinor: number): string {
  return `${formatter.format(priceMinor / 100)} ₴`;
}

// "599,50" / "599.5" / "600" → kopiyky; null for anything that isn't a price
export function parsePrice(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

// For an input's value: 59950 → "599.5"
export const priceInputValue = (priceMinor: number) => String(priceMinor / 100);
