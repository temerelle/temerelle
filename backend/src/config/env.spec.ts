import { envProblems, validateEnv } from './env';

const MINIMAL = {
  DATABASE_URL: 'postgresql://user:pass@host/db',
  FRONTEND_URL: 'http://localhost:3000',
  JWT_SECRET: 'x'.repeat(32),
};

const FULL = {
  ...MINIMAL,
  NODE_ENV: 'production',
  DATABASE_URL_UNPOOLED: 'postgresql://user:pass@direct-host/db',
  VAPID_PUBLIC_KEY: 'pub',
  VAPID_PRIVATE_KEY: 'priv',
  VAPID_SUBJECT: 'mailto:a@example.com',
  PORT: '3001',
};

describe('envProblems', () => {
  it('a local setup needs only the database, the frontend address and the JWT secret', () => {
    expect(envProblems(MINIMAL)).toEqual([]);
  });

  it('a full production setup passes', () => {
    expect(envProblems(FULL)).toEqual([]);
  });

  it('missing or broken URLs', () => {
    expect(envProblems({})).toEqual(['DATABASE_URL is missing', 'FRONTEND_URL is missing', 'JWT_SECRET is missing']);
    expect(envProblems({ ...MINIMAL, DATABASE_URL: 'not a url' })).toEqual(['DATABASE_URL is not a URL']);
    expect(envProblems({ ...MINIMAL, DATABASE_URL_UNPOOLED: 'nope' })).toEqual(['DATABASE_URL_UNPOOLED is not a URL']);
  });

  it('JWT_SECRET is long enough', () => {
    expect(envProblems({ ...MINIMAL, JWT_SECRET: 'short' })).toEqual(['JWT_SECRET must be at least 32 characters']);
  });

  it('push keys: all or none', () => {
    expect(envProblems({ ...FULL, VAPID_SUBJECT: undefined, VAPID_PRIVATE_KEY: undefined })).toEqual([
      'Push: VAPID_PRIVATE_KEY, VAPID_SUBJECT missing (set all of VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, or none)',
    ]);
  });

  it('PORT is a positive whole number', () => {
    expect(envProblems({ ...MINIMAL, PORT: 'abc' })).toEqual(['PORT must be a positive whole number']);
    expect(envProblems({ ...MINIMAL, PORT: '0' })).toEqual(['PORT must be a positive whole number']);
  });
});

describe('validateEnv', () => {
  it('throws one error listing every problem', () => {
    expect(() => validateEnv({})).toThrow(
      'Invalid environment:\n- DATABASE_URL is missing\n- FRONTEND_URL is missing\n- JWT_SECRET is missing',
    );
  });

  it('passes a good setup', () => {
    expect(() => validateEnv(FULL)).not.toThrow();
  });
});
