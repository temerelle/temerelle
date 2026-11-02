import { hash, verify, type Algorithm } from '@node-rs/argon2';

// Algorithm.Argon2id: a const enum, which isolatedModules can't read from the package
const ARGON2ID = 2 as Algorithm;

// Argon2id with the library defaults: 19 MiB, t=2, p=1 (the OWASP minimum)
export function hashPassword(password: string): Promise<string> {
  return hash(password, { algorithm: ARGON2ID });
}

let dummyHash: Promise<string> | undefined;

// An unknown email still costs one verify, so response time doesn't reveal which accounts exist
export async function passwordMatches(password: string, passwordHash: string | undefined): Promise<boolean> {
  dummyHash ??= hashPassword('not-a-real-password');
  const matches = await verify(passwordHash ?? (await dummyHash), password).catch(() => false);
  return passwordHash !== undefined && matches;
}
