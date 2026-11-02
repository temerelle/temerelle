import { hashPassword, passwordMatches } from './password';

describe('password', () => {
  it('hashes with Argon2id', async () => {
    expect(await hashPassword('correct horse')).toMatch(/^\$argon2id\$/);
  });

  it('accepts the right password, rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse');
    await expect(passwordMatches('correct horse', hash)).resolves.toBe(true);
    await expect(passwordMatches('wrong horse', hash)).resolves.toBe(false);
  });

  it('no account: false, never a match against the dummy hash', async () => {
    await expect(passwordMatches('not-a-real-password', undefined)).resolves.toBe(false);
  });

  it('a broken hash is a mismatch, not a crash', async () => {
    await expect(passwordMatches('x', 'not-a-hash')).resolves.toBe(false);
  });
});
