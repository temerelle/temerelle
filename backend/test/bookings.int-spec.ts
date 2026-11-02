import { DateTime } from 'luxon';
import { Client, startApp, type TestApp } from './app';

let t: TestApp;
let n = 0;

beforeAll(async () => {
  t = await startApp();
});
afterAll(() => t.close());

const KYIV = 'Europe/Kyiv';
// Two days ahead: past the 1-hour notice, within the 30-day horizon, whatever the hour the tests run
const date = DateTime.now().setZone(KYIV).plus({ days: 2 }).toISODate()!;
const at = (time: string) => DateTime.fromISO(`${date}T${time}`, { zone: KYIV }).toUTC().toISO()!;

async function signedIn(name = 'Client') {
  const client = new Client(t.baseUrl);
  const res = await client.post('/auth/register', {
    email: `book${++n}-${Date.now()}@example.com`,
    password: 'correct horse battery',
    name,
    phone: '+380 67 000 00 00',
  });
  expect(res.status).toBe(201);
  return client;
}

// A business open 09:00–18:00 every day, with one 60-minute service
async function shop() {
  const owner = await signedIn('Owner');
  const business = (await owner.post('/businesses', { name: `Барбер ${Date.now()}-${n}` })).body as { id: string };
  const days = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({ dayOfWeek, intervals: [{ start: '09:00', end: '18:00' }] }));
  expect((await owner.request('PUT', `/businesses/${business.id}/schedule`, { days })).status).toBe(200);
  const service = (
    await owner.post(`/businesses/${business.id}/services`, { name: 'Стрижка', durationMinutes: 60, priceMinor: 50000 })
  ).body as { id: string };
  return { owner, businessId: business.id, serviceId: service.id };
}

const slotsOf = async (client: Client, businessId: string, serviceId: string, day = date) =>
  (await client.get(`/businesses/${businessId}/availability?serviceId=${serviceId}&date=${day}`)).body.slots as {
    time: string;
    startsAt: string;
  }[];

describe('bookings', () => {
  it('availability → request (pending) → the time is gone; a taken or made-up time: 409', async () => {
    const { businessId, serviceId } = await shop();
    const visitor = new Client(t.baseUrl);
    const slots = await slotsOf(visitor, businessId, serviceId);
    expect(slots[0]).toEqual({ time: '09:00', startsAt: at('09:00') });
    expect(slots.at(-1)!.time).toBe('17:00');

    const client = await signedIn('Олена');
    const res = await client.post('/bookings', { businessId, serviceId, startsAt: at('10:00') });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'pending',
      serviceName: 'Стрижка',
      priceMinor: 50000,
      durationMinutes: 60,
      startsAt: at('10:00'),
      endsAt: at('11:00'),
    });
    expect(res.body).not.toHaveProperty('clientPhone');
    expect(res.body.canCancel).toBe(true);

    const after = (await slotsOf(visitor, businessId, serviceId)).map((s) => s.time);
    expect(after).not.toContain('10:00');
    expect(after).not.toContain('09:15');
    expect(after).toContain('09:00');
    expect(after).toContain('11:00');

    const other = await signedIn();
    const taken = await other.post('/bookings', { businessId, serviceId, startsAt: at('10:30') });
    expect(taken.status).toBe(409);
    expect(taken.body.code).toBe('BOOKING_CONFLICT');
    expect((await other.post('/bookings', { businessId, serviceId, startsAt: at('17:30') })).status).toBe(409);
    expect((await visitor.post('/bookings', { businessId, serviceId, startsAt: at('12:00') })).status).toBe(401);
  });

  it("the owner can't request their own business: they add bookings in the calendar", async () => {
    const { owner, businessId, serviceId } = await shop();
    const res = await owner.post('/bookings', { businessId, serviceId, startsAt: at('10:00') });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('OWN_BUSINESS');
  });

  it('two clients at once for the same time: exactly one gets it', async () => {
    const { businessId, serviceId } = await shop();
    const [a, b] = await Promise.all([signedIn(), signedIn()]);
    const results = await Promise.all(
      [a, b].map((c) => c.post('/bookings', { businessId, serviceId, startsAt: at('12:00') })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('owner: sees the request with the phone, confirms once; another owner gets 404', async () => {
    const { owner, businessId, serviceId } = await shop();
    const client = await signedIn('Олена');
    const booking = (await client.post('/bookings', { businessId, serviceId, startsAt: at('09:00') })).body;

    const pending = await owner.get(`/businesses/${businessId}/bookings?status=pending`);
    expect(pending.body.items).toHaveLength(1);
    expect(pending.body.items[0]).toMatchObject({
      clientName: 'Олена',
      clientPhone: '+380 67 000 00 00',
      manual: false,
    });

    const stranger = (await shop()).owner;
    expect((await stranger.post(`/businesses/${businessId}/bookings/${booking.id}/confirm`)).status).toBe(404);

    const confirmed = await owner.post(`/businesses/${businessId}/bookings/${booking.id}/confirm`);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.status).toBe('confirmed');
    const again = await owner.post(`/businesses/${businessId}/bookings/${booking.id}/confirm`);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('BOOKING_NOT_CHANGEABLE');
  });

  it('reject with a reason: the client sees it, and the time is free again', async () => {
    const { owner, businessId, serviceId } = await shop();
    const client = await signedIn();
    const booking = (await client.post('/bookings', { businessId, serviceId, startsAt: at('14:00') })).body;
    const rejected = await owner.post(`/businesses/${businessId}/bookings/${booking.id}/reject`, {
      reason: 'Майстер хворіє',
    });
    expect(rejected.body).toMatchObject({ status: 'cancelled', cancelledBy: 'owner' });

    const my = (await client.get('/bookings/my')).body;
    expect(my.upcoming[0]).toMatchObject({ id: booking.id, status: 'cancelled', cancellationReason: 'Майстер хворіє' });
    expect(my.upcoming[0].business.id).toBe(businessId);
    expect((await slotsOf(client, businessId, serviceId)).map((s) => s.time)).toContain('14:00');
  });

  it('cancel: the client their own, the owner any; someone else gets 404', async () => {
    const { owner, businessId, serviceId } = await shop();
    const client = await signedIn();
    const first = (await client.post('/bookings', { businessId, serviceId, startsAt: at('09:00') })).body;
    const second = (await client.post('/bookings', { businessId, serviceId, startsAt: at('11:00') })).body;

    const stranger = await signedIn();
    expect((await stranger.post(`/bookings/${first.id}/cancel`)).status).toBe(404);

    const byClient = await client.post(`/bookings/${first.id}/cancel`);
    expect(byClient.status).toBe(200);
    expect(byClient.body).toMatchObject({ status: 'cancelled', cancelledBy: 'client' });
    expect((await client.post(`/bookings/${first.id}/cancel`)).status).toBe(409);

    const byOwner = await owner.post(`/bookings/${second.id}/cancel`, { reason: 'Вихідний' });
    expect(byOwner.body).toMatchObject({ status: 'cancelled', cancelledBy: 'owner', cancellationReason: 'Вихідний' });
  });

  it('confirm and cancel racing: only one wins', async () => {
    const { owner, businessId, serviceId } = await shop();
    const client = await signedIn();
    const booking = (await client.post('/bookings', { businessId, serviceId, startsAt: at('15:00') })).body;
    const [confirm, cancel] = await Promise.all([
      owner.post(`/businesses/${businessId}/bookings/${booking.id}/confirm`),
      client.post(`/bookings/${booking.id}/cancel`),
    ]);
    if (confirm.status === 200) {
      // Confirmed first: cancelling a confirmed booking is still allowed
      expect(cancel.status).toBe(200);
    } else {
      expect(confirm.status).toBe(409);
      expect(cancel.status).toBe(200);
    }
    const { rows } = await t.sql.query('SELECT status FROM bookings WHERE id = $1', [booking.id]);
    expect(rows[0].status).toBe('cancelled');
  });

  it('manual booking: confirmed at once, outside hours too; overlaps and the past refused', async () => {
    const { owner, businessId, serviceId } = await shop();
    const manual = await owner.post(`/businesses/${businessId}/bookings`, {
      serviceId,
      date,
      time: '19:00',
      clientName: 'Іван',
      clientPhone: '',
    });
    expect(manual.status).toBe(201);
    expect(manual.body).toMatchObject({ status: 'confirmed', manual: true, clientName: 'Іван', clientPhone: null });

    const overlap = await owner.post(`/businesses/${businessId}/bookings`, {
      serviceId,
      date,
      time: '19:30',
      clientName: 'Петро',
    });
    expect(overlap.body.code).toBe('BOOKING_CONFLICT');
    const past = await owner.post(`/businesses/${businessId}/bookings`, {
      serviceId,
      date: DateTime.now().setZone(KYIV).minus({ days: 1 }).toISODate(),
      time: '10:00',
      clientName: 'Петро',
    });
    expect(past.status).toBe(409);

    const day = await owner.get(`/businesses/${businessId}/bookings?from=${date}&to=${date}`);
    expect(day.body.items.map((b: { clientName: string }) => b.clientName)).toEqual(['Іван']);
  });

  it('inactive service and a day off: no booking', async () => {
    const { owner, businessId, serviceId } = await shop();
    await owner.post(`/businesses/${businessId}/exceptions`, { date, isDayOff: true });
    expect(await slotsOf(owner, businessId, serviceId)).toEqual([]);

    await owner.patch(`/businesses/${businessId}/services/${serviceId}`, { isActive: false });
    const res = await owner.get(`/businesses/${businessId}/availability?serviceId=${serviceId}&date=${date}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SERVICE_NOT_FOUND');
  });

  it('a pending booking that already started cannot be confirmed', async () => {
    const { owner, businessId, serviceId } = await shop();
    const { rows } = await t.sql.query(
      `INSERT INTO bookings (business_id, resource_id, service_id, client_name, starts_at, ends_at, status,
         service_name_snapshot, price_minor_snapshot, currency_snapshot, duration_minutes_snapshot)
       SELECT $1, r.id, $2, 'Old', now() - interval '30 minutes', now() + interval '30 minutes', 'pending',
         'Стрижка', 50000, 'UAH', 60
       FROM resources r WHERE r.business_id = $1 AND r.is_default
       RETURNING id`,
      [businessId, serviceId],
    );
    const res = await owner.post(`/businesses/${businessId}/bookings/${rows[0].id}/confirm`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BOOKING_NOT_CHANGEABLE');
  });

  it('database: the same time on another resource of the business is allowed (multi-resource ready)', async () => {
    const { businessId, serviceId } = await shop();
    const client = await signedIn();
    expect((await client.post('/bookings', { businessId, serviceId, startsAt: at('16:00') })).status).toBe(201);
    const insert = (resourceSql: string) =>
      t.sql.query(
        `INSERT INTO bookings (business_id, resource_id, service_id, client_name, starts_at, ends_at, status,
           service_name_snapshot, price_minor_snapshot, currency_snapshot, duration_minutes_snapshot)
         VALUES ($1, (${resourceSql}), $2, 'X', $3, $3::timestamptz + interval '60 minutes', 'confirmed',
           'Стрижка', 50000, 'UAH', 60)`,
        [businessId, serviceId, at('16:00')],
      );
    await expect(insert('SELECT id FROM resources WHERE business_id = $1 AND is_default')).rejects.toThrow(
      /bookings_no_active_overlap/,
    );
    await t.sql.query(`INSERT INTO resources (business_id, name, is_default) VALUES ($1, 'Second chair', false)`, [
      businessId,
    ]);
    await expect(insert('SELECT id FROM resources WHERE business_id = $1 AND NOT is_default')).resolves.toBeDefined();
  });

  it('a client deletes the account: upcoming bookings are cancelled, the owner keeps the name', async () => {
    const { owner, businessId, serviceId } = await shop();
    const client = await signedIn('Марта');
    const booking = (await client.post('/bookings', { businessId, serviceId, startsAt: at('13:00') })).body;
    expect((await client.delete('/auth/account', { password: 'correct horse battery' })).status).toBe(200);
    const day = await owner.get(`/businesses/${businessId}/bookings?from=${date}&to=${date}`);
    expect(day.body.items[0]).toMatchObject({ id: booking.id, status: 'cancelled', clientName: 'Марта' });
  });
});
