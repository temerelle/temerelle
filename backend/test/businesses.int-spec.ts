import { Client, startApp, type TestApp } from './app';

let t: TestApp;
let n = 0;

beforeAll(async () => {
  t = await startApp();
});
afterAll(() => t.close());

async function signedIn() {
  const client = new Client(t.baseUrl);
  const res = await client.post('/auth/register', {
    email: `biz${++n}-${Date.now()}@example.com`,
    password: 'correct horse battery',
    name: 'Owner',
  });
  expect(res.status).toBe(201);
  return { client, userId: res.body.user.id as string };
}

async function ownerWithBusiness(name = `Мийка ${n + 1} ${Date.now()}`) {
  const owner = await signedIn();
  const res = await owner.client.post('/businesses', { name, description: 'Біля метро' });
  expect(res.status).toBe(201);
  return { ...owner, business: res.body as { id: string; code: string; name: string } };
}

describe('businesses', () => {
  it('create: a code from the name, and exactly one default resource with it', async () => {
    const { business } = await ownerWithBusiness('Манікюр Олі');
    expect(business.code).toMatch(/^manikiur-oli(-\d+)?$/);
    const { rows } = await t.sql.query('SELECT is_default, is_active FROM resources WHERE business_id = $1', [
      business.id,
    ]);
    expect(rows).toEqual([{ is_default: true, is_active: true }]);
  });

  it('the same name twice: the second gets the next free code', async () => {
    const name = `AquaWash ${Date.now()}`;
    const first = await ownerWithBusiness(name);
    const second = await ownerWithBusiness(name);
    expect(second.business.code).toBe(`${first.business.code}-2`);
  });

  it('a taken code chosen by hand: 409 CODE_TAKEN', async () => {
    const { business } = await ownerWithBusiness();
    const other = await signedIn();
    const res = await other.client.post('/businesses', { name: 'X', code: business.code });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CODE_TAKEN');
  });

  it('public profile by code or id, without owner details; mine lists it for the owner only', async () => {
    const { client, business } = await ownerWithBusiness();
    const visitor = new Client(t.baseUrl);
    const byCode = await visitor.get(`/businesses/${business.code}`);
    expect(byCode.status).toBe(200);
    expect(byCode.body).toEqual({
      id: business.id,
      name: business.name,
      code: business.code,
      description: 'Біля метро',
      timezone: 'Europe/Kyiv',
    });
    expect((await visitor.get(`/businesses/${business.id}`)).body.id).toBe(business.id);

    expect((await client.get('/businesses/mine')).body.items.map((b: { id: string }) => b.id)).toEqual([business.id]);
    expect((await (await signedIn()).client.get('/businesses/mine')).body.items).toEqual([]);
  });

  it("someone else's business can't be changed: 404, as if it didn't exist", async () => {
    const { business } = await ownerWithBusiness();
    const stranger = await signedIn();
    const res = await stranger.client.patch(`/businesses/${business.id}`, { name: 'Hijacked' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('BUSINESS_NOT_FOUND');
  });

  it('switched off: gone from search and the public page, still there for the owner', async () => {
    const name = `Hidden Salon ${Date.now()}`;
    const { client, business } = await ownerWithBusiness(name);
    const visitor = new Client(t.baseUrl);
    expect((await visitor.get(`/businesses?q=${encodeURIComponent(name)}`)).body.items).toHaveLength(1);

    expect((await client.patch(`/businesses/${business.id}`, { isActive: false })).body.isActive).toBe(false);
    expect((await visitor.get(`/businesses?q=${encodeURIComponent(name)}`)).body.items).toHaveLength(0);
    expect((await visitor.get(`/businesses/${business.code}`)).status).toBe(404);
    expect((await client.get(`/businesses/${business.code}`)).status).toBe(200);
  });

  it('search: by part of the name or of the code; LIKE wildcards are literal', async () => {
    const stamp = Date.now();
    const { business } = await ownerWithBusiness(`Барбершоп Борода ${stamp}`);
    const visitor = new Client(t.baseUrl);
    expect((await visitor.get(`/businesses?q=${encodeURIComponent(`борода ${stamp}`)}`)).body.items[0].id).toBe(
      business.id,
    );
    expect((await visitor.get(`/businesses?q=${business.code}`)).body.items[0].id).toBe(business.id);
    expect(
      (await visitor.get(`/businesses?q=${business.code.slice(-6)}`)).body.items.map((b: { id: string }) => b.id),
    ).toContain(business.id);
    expect((await visitor.get('/businesses?q=%25%25')).body.items).toEqual([]);
    expect((await visitor.get('/businesses?q=a')).body.items).toEqual([]);
  });

  it('an unknown time zone is refused', async () => {
    const { client, business } = await ownerWithBusiness();
    const res = await client.patch(`/businesses/${business.id}`, { timezone: 'Mars/Olympus' });
    expect(res.body.code).toBe('INVALID_TIMEZONE');
    expect((await client.patch(`/businesses/${business.id}`, { timezone: 'Europe/Warsaw' })).body.timezone).toBe(
      'Europe/Warsaw',
    );
  });
});

describe('services', () => {
  it('owner creates and edits; clients see only active ones; the owner can ask for all', async () => {
    const { client, business } = await ownerWithBusiness();
    const base = `/businesses/${business.id}/services`;
    const wash = await client.post(base, { name: 'Комплексна мийка', durationMinutes: 60, priceMinor: 50000 });
    expect(wash.status).toBe(201);
    expect(wash.body).toMatchObject({ durationMinutes: 60, priceMinor: 50000, currency: 'UAH', isActive: true });
    await client.post(base, { name: 'Хімчистка', durationMinutes: 180, priceMinor: 250000 });

    const off = await client.patch(`${base}/${wash.body.id}`, { isActive: false });
    expect(off.body.isActive).toBe(false);

    const visitor = new Client(t.baseUrl);
    expect((await visitor.get(base)).body.items.map((s: { name: string }) => s.name)).toEqual(['Хімчистка']);
    expect((await client.get(`${base}?includeInactive=true`)).body.items).toHaveLength(2);
    expect((await visitor.get(`${base}?includeInactive=true`)).status).toBe(401);
  });

  it('bad duration or price: 400; another business cannot touch them', async () => {
    const { client, business } = await ownerWithBusiness();
    const base = `/businesses/${business.id}/services`;
    expect((await client.post(base, { name: 'X', durationMinutes: 0, priceMinor: 100 })).status).toBe(400);
    expect((await client.post(base, { name: 'X', durationMinutes: 60, priceMinor: 9.5 })).status).toBe(400);
    expect((await client.post(base, { name: 'X', durationMinutes: 60, priceMinor: -1 })).status).toBe(400);

    const service = await client.post(base, { name: 'X', durationMinutes: 60, priceMinor: 100 });
    const stranger = await ownerWithBusiness();
    expect((await stranger.client.patch(`${base}/${service.body.id}`, { priceMinor: 1 })).status).toBe(404);
    // Its own business id, someone else's service id
    const crossed = await stranger.client.patch(`/businesses/${stranger.business.id}/services/${service.body.id}`, {
      priceMinor: 1,
    });
    expect(crossed.body.code).toBe('SERVICE_NOT_FOUND');
  });
});

describe('schedule', () => {
  it('put the week, read it back as seven days on the default resource', async () => {
    const { client, business } = await ownerWithBusiness();
    const res = await client.request('PUT', `/businesses/${business.id}/schedule`, {
      days: [
        {
          dayOfWeek: 1,
          intervals: [
            { start: '14:00', end: '18:00' },
            { start: '09:00', end: '13:00' },
          ],
        },
        { dayOfWeek: 6, intervals: [{ start: '10:00', end: '24:00' }] },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.timezone).toBe('Europe/Kyiv');
    expect(res.body.days).toHaveLength(7);
    expect(res.body.days[0]).toEqual({
      dayOfWeek: 1,
      intervals: [
        { start: '09:00', end: '13:00' },
        { start: '14:00', end: '18:00' },
      ],
    });
    expect(res.body.days[5].intervals).toEqual([{ start: '10:00', end: '24:00' }]);
    expect(res.body.days[6].intervals).toEqual([]);

    // Public, and on the default resource
    expect((await new Client(t.baseUrl).get(`/businesses/${business.id}/schedule`)).body).toEqual(res.body);
    const { rows } = await t.sql.query(
      'SELECT count(*)::int AS n FROM working_hours w JOIN resources r ON r.id = w.resource_id WHERE r.business_id = $1 AND r.is_default',
      [business.id],
    );
    expect(rows[0].n).toBe(3);
  });

  it('overlapping or off-grid hours: 400 SCHEDULE_INVALID, the old week stays', async () => {
    const { client, business } = await ownerWithBusiness();
    const url = `/businesses/${business.id}/schedule`;
    await client.request('PUT', url, { days: [{ dayOfWeek: 2, intervals: [{ start: '09:00', end: '17:00' }] }] });

    const overlap = await client.request('PUT', url, {
      days: [
        {
          dayOfWeek: 2,
          intervals: [
            { start: '09:00', end: '13:00' },
            { start: '12:00', end: '18:00' },
          ],
        },
      ],
    });
    expect(overlap.status).toBe(400);
    expect(overlap.body.code).toBe('SCHEDULE_INVALID');
    expect(
      (await client.request('PUT', url, { days: [{ dayOfWeek: 2, intervals: [{ start: '17:00', end: '09:00' }] }] }))
        .status,
    ).toBe(400);
    expect((await client.get(url)).body.days[1].intervals).toEqual([{ start: '09:00', end: '17:00' }]);
  });

  it('exceptions: a day off, then own hours for the same date replace it; delete brings the week back', async () => {
    const { client, business } = await ownerWithBusiness();
    const url = `/businesses/${business.id}/exceptions`;
    const date = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

    const dayOff = await client.post(url, { date, isDayOff: true });
    expect(dayOff.status).toBe(201);
    expect(dayOff.body).toMatchObject({ date, isDayOff: true, intervals: [] });

    const short = await client.post(url, { date, isDayOff: false, intervals: [{ start: '10:00', end: '14:00' }] });
    expect(short.body).toMatchObject({ date, isDayOff: false, intervals: [{ start: '10:00', end: '14:00' }] });
    expect((await client.get(url)).body.items).toEqual([short.body]);

    expect((await client.delete(`${url}/${short.body.id}`)).status).toBe(200);
    expect((await client.get(url)).body.items).toEqual([]);
  });

  it('exceptions: a past date or no hours on a working day are refused; strangers get 404', async () => {
    const { client, business } = await ownerWithBusiness();
    const url = `/businesses/${business.id}/exceptions`;
    expect((await client.post(url, { date: '2020-01-01', isDayOff: true })).body.code).toBe('DATE_OUT_OF_RANGE');
    const date = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
    expect((await client.post(url, { date, isDayOff: false, intervals: [] })).body.code).toBe('SCHEDULE_INVALID');

    const stranger = await signedIn();
    expect((await stranger.client.post(url, { date, isDayOff: true })).status).toBe(404);
    expect((await stranger.client.get(url)).status).toBe(404);
  });
});
