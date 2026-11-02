import { withVerifiedSsl } from './connection-string';

describe('withVerifiedSsl', () => {
  it('turns the weaker modes into verify-full, keeping the other parameters', () => {
    expect(withVerifiedSsl('postgresql://u:p@ep-x.neon.tech/db?sslmode=require')).toBe(
      'postgresql://u:p@ep-x.neon.tech/db?sslmode=verify-full',
    );
    expect(withVerifiedSsl('postgresql://u:p@h/db?channel_binding=require&sslmode=require&x=1')).toBe(
      'postgresql://u:p@h/db?channel_binding=require&sslmode=verify-full&x=1',
    );
  });

  it('leaves a URL without sslmode, or already verify-full, as it is', () => {
    expect(withVerifiedSsl('postgresql://u:p@localhost:5432/db')).toBe('postgresql://u:p@localhost:5432/db');
    expect(withVerifiedSsl('postgresql://h/db?sslmode=verify-full')).toBe('postgresql://h/db?sslmode=verify-full');
    expect(withVerifiedSsl(undefined)).toBeUndefined();
  });
});
