import { CODE_PATTERN, codeFromName, firstFreeCode } from './business-code';

describe('codeFromName', () => {
  it('transliterates Ukrainian and joins words with dashes', () => {
    expect(codeFromName('Манікюр Олі')).toBe('manikiur-oli');
    expect(codeFromName('Автомийка «Щедра»')).toBe('avtomyika-shchedra');
    expect(codeFromName("Ательє Мар'яни")).toBe('atelie-mariany');
  });

  it('keeps latin and digits, drops the rest', () => {
    expect(codeFromName('AquaWash 24/7!')).toBe('aquawash-24-7');
  });

  it('always gives a valid code', () => {
    for (const name of ['A', '!!!', 'Я', 'x'.repeat(80), '  Салон   краси  ']) {
      expect(codeFromName(name)).toMatch(CODE_PATTERN);
    }
    expect(codeFromName('!!!')).toBe('business');
  });
});

describe('firstFreeCode', () => {
  it('the base when free, else the first free numbered one', () => {
    expect(firstFreeCode('aquawash', [])).toBe('aquawash');
    expect(firstFreeCode('aquawash', ['aquawash', 'aquawash-2'])).toBe('aquawash-3');
  });

  it('never a reserved code', () => {
    expect(firstFreeCode('mine', [])).toBe('mine-2');
  });

  it('stays within 32 characters', () => {
    const base = 'a'.repeat(32);
    const code = firstFreeCode(base, [base]);
    expect(code).toHaveLength(32);
    expect(code).toMatch(CODE_PATTERN);
    expect(code.endsWith('-2')).toBe(true);
  });
});
