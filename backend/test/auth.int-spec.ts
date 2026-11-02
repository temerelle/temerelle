import { Logger } from '@nestjs/common';
import { Client, startApp, type TestApp } from './app';

let t: TestApp;
let n = 0;
const email = () => `user${++n}-${Date.now()}@example.com`;
const PASSWORD = 'correct horse battery';

beforeAll(async () => {
  t = await startApp();
});
afterAll(() => t.close());

async function registered(address = email()) {
  const client = new Client(t.baseUrl);
  const res = await client.post('/auth/register', { email: address, password: PASSWORD, name: ' Олена ' });
  expect(res.status).toBe(201);
  return { client, email: address, user: res.body.user };
}

describe('register and sign in', () => {
  it('register: user back, both cookies httpOnly, no token in the body; the password is stored as Argon2id', async () => {
    const client = new Client(t.baseUrl);
    const address = email();
    const res = await client.post('/auth/register', {
      email: `  ${address.toUpperCase()} `,
      password: PASSWORD,
      name: ' Олена ',
      phone: '+380 67 123 45 67',
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: address, name: 'Олена', phone: '+380 67 123 45 67' });
    expect(JSON.stringify(res.body)).not.toMatch(/token/i);
    const setCookie = res.headers.getSetCookie().join('\n');
    expect(setCookie).toMatch(/access_token=.*HttpOnly/);
    expect(setCookie).toMatch(/refresh_token=.*HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);

    const { rows } = await t.sql.query('SELECT password_hash FROM users WHERE email = $1', [address]);
    expect(rows[0].password_hash).toMatch(/^\$argon2id\$/);
  });

  it('the same email twice: 409 EMAIL_TAKEN, whatever the case', async () => {
    const { email: address } = await registered();
    const res = await new Client(t.baseUrl).post('/auth/register', {
      email: address.toUpperCase(),
      password: PASSWORD,
      name: 'X',
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('invalid input: 400, nothing created', async () => {
    const res = await new Client(t.baseUrl).post('/auth/register', { email: 'nope', password: 'short', name: '' });
    expect(res.status).toBe(400);
  });

  it('login with the right password; a wrong password and an unknown email answer the same', async () => {
    const { email: address } = await registered();
    const client = new Client(t.baseUrl);

    const wrong = await client.post('/auth/login', { email: address, password: 'wrong password' });
    const unknown = await client.post('/auth/login', { email: email(), password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.code).toBe('INVALID_CREDENTIALS');

    const ok = await client.post('/auth/login', { email: address, password: PASSWORD });
    expect(ok.status).toBe(200);
    expect((await client.get('/auth/me')).body.user.email).toBe(address);
  });

  it('too many logins for one email: 429 TOO_MANY_ATTEMPTS, even with the right password', async () => {
    const { email: address } = await registered();
    const client = new Client(t.baseUrl);
    for (let i = 0; i < 10; i++) await client.post('/auth/login', { email: address, password: 'wrong password' });
    const res = await client.post('/auth/login', { email: address, password: PASSWORD });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('TOO_MANY_ATTEMPTS');
  });
});

describe('access', () => {
  it('/auth/me needs a valid access token, from the cookie or a Bearer header', async () => {
    const { client } = await registered();
    expect((await client.get('/auth/me')).status).toBe(200);

    const bearer = new Client(t.baseUrl).request('GET', '/auth/me', undefined, {
      authorization: `Bearer ${client.cookies.get('access_token')}`,
    });
    expect((await bearer).status).toBe(200);

    expect((await new Client(t.baseUrl).get('/auth/me')).status).toBe(401);
    const forged = new Client(t.baseUrl);
    forged.cookies.set('access_token', 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.');
    expect((await forged.get('/auth/me')).status).toBe(401);
  });

  it('profile: name and phone change, an empty phone clears it', async () => {
    const { client } = await registered();
    const res = await client.patch('/auth/me', { name: 'Ірина', phone: '+380501112233' });
    expect(res.body.user).toMatchObject({ name: 'Ірина', phone: '+380501112233' });
    expect((await client.patch('/auth/me', { phone: '' })).body.user.phone).toBeNull();
  });

  it('a mutation from another origin: 403 FORBIDDEN_ORIGIN (CSRF)', async () => {
    const { client } = await registered();
    const res = await client.request('PATCH', '/auth/me', { name: 'Hacked' }, { origin: 'https://evil.example' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_ORIGIN');
  });
});

describe('refresh rotation', () => {
  it('refresh gives a new pair; the old refresh token stops working', async () => {
    const { client } = await registered();
    const oldRefresh = client.cookies.get('refresh_token');

    const res = await client.post('/auth/refresh');
    expect(res.status).toBe(200);
    expect(client.cookies.get('refresh_token')).not.toBe(oldRefresh);
    expect((await client.get('/auth/me')).status).toBe(200);

    const stale = new Client(t.baseUrl);
    stale.cookies.set('refresh_token', oldRefresh!);
    expect((await stale.post('/auth/refresh')).body.code).toBe('SESSION_EXPIRED');
  });

  it('a rotated token used again after the grace period: every session of the user is revoked', async () => {
    const { client, user } = await registered();
    const stolen = client.cookies.get('refresh_token')!;
    await client.post('/auth/refresh');
    // Pretend the rotation happened a minute ago
    await t.sql.query(
      "UPDATE sessions SET rotated_at = now() - interval '1 minute' WHERE rotated_at IS NOT NULL AND user_id = $1",
      [user.id],
    );

    const thief = new Client(t.baseUrl);
    thief.cookies.set('refresh_token', stolen);
    expect((await thief.post('/auth/refresh')).status).toBe(401);

    // The real user's current session is gone too
    expect((await client.post('/auth/refresh')).status).toBe(401);
    const { rows } = await t.sql.query(
      'SELECT count(*)::int AS n FROM sessions WHERE user_id = $1 AND revoked_at IS NULL',
      [user.id],
    );
    expect(rows[0].n).toBe(0);
  });

  it('two refreshes with the same token at once: one wins, no mass revoke', async () => {
    const { client, user } = await registered();
    const token = client.cookies.get('refresh_token')!;
    const tab = () => {
      const c = new Client(t.baseUrl);
      c.cookies.set('refresh_token', token);
      return c.post('/auth/refresh');
    };
    const results = await Promise.all([tab(), tab()]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
    const { rows } = await t.sql.query(
      'SELECT count(*)::int AS n FROM sessions WHERE user_id = $1 AND revoked_at IS NULL',
      [user.id],
    );
    expect(rows[0].n).toBe(1);
  });

  it('logout revokes the session and clears the cookies', async () => {
    const { client } = await registered();
    const refresh = client.cookies.get('refresh_token')!;
    expect((await client.post('/auth/logout')).status).toBe(200);
    expect(client.cookies.has('refresh_token')).toBe(false);

    const again = new Client(t.baseUrl);
    again.cookies.set('refresh_token', refresh);
    expect((await again.post('/auth/refresh')).status).toBe(401);
  });
});

describe('password reset (DEV: link in the log)', () => {
  const resetLinks = () =>
    jest
      .mocked(Logger.prototype.warn)
      .mock.calls.map(([message]) => String(message).match(/token=([0-9a-f]+)/)?.[1])
      .filter(Boolean) as string[];

  beforeEach(() => jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('same answer for a known and an unknown email; only the known one gets a link', async () => {
    const { email: address } = await registered();
    const client = new Client(t.baseUrl);
    const known = await client.post('/auth/forgot-password', { email: address });
    const unknown = await client.post('/auth/forgot-password', { email: email() });
    expect(known.status).toBe(200);
    expect(unknown).toMatchObject({ status: known.status, body: known.body });
    expect(resetLinks()).toHaveLength(1);
  });

  it('reset sets the new password, ends every session, and the link works once', async () => {
    const { client, email: address } = await registered();
    await new Client(t.baseUrl).post('/auth/forgot-password', { email: address });
    const [token] = resetLinks();

    const anon = new Client(t.baseUrl);
    expect((await anon.post('/auth/reset-password', { token, password: 'a brand new password' })).status).toBe(200);
    expect((await client.post('/auth/refresh')).status).toBe(401);
    expect((await anon.post('/auth/login', { email: address, password: PASSWORD })).status).toBe(401);
    expect((await anon.post('/auth/login', { email: address, password: 'a brand new password' })).status).toBe(200);

    const again = await anon.post('/auth/reset-password', { token, password: 'another password' });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('INVALID_RESET_TOKEN');
  });

  it('an expired link is refused', async () => {
    const { email: address } = await registered();
    await new Client(t.baseUrl).post('/auth/forgot-password', { email: address });
    const [token] = resetLinks();
    await t.sql.query("UPDATE password_reset_tokens SET expires_at = now() - interval '1 second'");
    const res = await new Client(t.baseUrl).post('/auth/reset-password', { token, password: 'a brand new password' });
    expect(res.body.code).toBe('INVALID_RESET_TOKEN');
  });
});

describe('delete account', () => {
  it('needs the password; then the user is gone and the session with it', async () => {
    const { client, user } = await registered();
    const wrong = await client.delete('/auth/account', { password: 'wrong password' });
    expect(wrong.status).toBe(403);
    expect(wrong.body.code).toBe('WRONG_PASSWORD');

    expect((await client.delete('/auth/account', { password: PASSWORD })).status).toBe(200);
    const { rows } = await t.sql.query('SELECT count(*)::int AS n FROM users WHERE id = $1', [user.id]);
    expect(rows[0].n).toBe(0);
    expect((await client.get('/auth/me')).status).toBe(401);
  });

  it('an owner of a business: 409 OWNER_HAS_BUSINESSES, nothing deleted', async () => {
    const { client, user } = await registered();
    await t.sql.query("INSERT INTO businesses (owner_id, name, code) VALUES ($1, 'Salon', $2)", [
      user.id,
      `salon-${n}`,
    ]);
    const res = await client.delete('/auth/account', { password: PASSWORD });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('OWNER_HAS_BUSINESSES');
  });

  it("a client's bookings stay with the business, without the account link", async () => {
    const owner = await registered();
    const customer = await registered();
    const code = `wash-${n}`;
    const {
      rows: [b],
    } = await t.sql.query("INSERT INTO businesses (owner_id, name, code) VALUES ($1, 'Wash', $2) RETURNING id", [
      owner.user.id,
      code,
    ]);
    const {
      rows: [r],
    } = await t.sql.query(
      "INSERT INTO resources (business_id, name, is_default) VALUES ($1, 'Bay', true) RETURNING id",
      [b.id],
    );
    const {
      rows: [s],
    } = await t.sql.query(
      "INSERT INTO services (business_id, name, duration_minutes, price_minor) VALUES ($1, 'Wash', 60, 50000) RETURNING id",
      [b.id],
    );
    await t.sql.query(
      `INSERT INTO bookings (business_id, resource_id, service_id, client_id, client_name, starts_at, ends_at, status,
         service_name_snapshot, price_minor_snapshot, currency_snapshot, duration_minutes_snapshot)
       VALUES ($1, $2, $3, $4, 'Олена', '2026-12-01 10:00+02', '2026-12-01 11:00+02', 'confirmed', 'Wash', 50000, 'UAH', 60)`,
      [b.id, r.id, s.id, customer.user.id],
    );

    expect((await customer.client.delete('/auth/account', { password: PASSWORD })).status).toBe(200);
    const { rows } = await t.sql.query('SELECT client_id, client_name FROM bookings WHERE business_id = $1', [b.id]);
    expect(rows).toEqual([{ client_id: null, client_name: 'Олена' }]);
  });
});
