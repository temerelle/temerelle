// Public search code: lower-case latin, digits and dashes, 3–32 characters (same rule as the DB CHECK)
export const CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

// Would clash with API routes (GET /businesses/mine)
export const RESERVED_CODES = new Set(['mine']);

// Ukrainian national transliteration (2010), simplified to one form per letter; a few Russian letters too
const LETTERS: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ie',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'iu',
  я: 'ia',
  ы: 'y',
  э: 'e',
  ё: 'e',
  ъ: '',
  "'": '',
  '’': '',
  ʼ: '',
};

// "Манікюр Олі" → "manikiur-oli"; a name with nothing usable gives "business"
export function codeFromName(name: string): string {
  const latin = [...name.toLowerCase()].map((ch) => LETTERS[ch] ?? ch).join('');
  const code = latin
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 32)
    .replace(/^-+|-+$/g, '');
  return CODE_PATTERN.test(code) ? code : code.length >= 1 ? `${code}-biz`.slice(0, 32) : 'business';
}

// The first free one of code, code-2, code-3…, given the codes already taken that start with it
export function firstFreeCode(base: string, taken: Iterable<string>): string {
  const used = new Set([...taken, ...RESERVED_CODES]);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, 32 - suffix.length).replace(/-+$/, '')}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
}
