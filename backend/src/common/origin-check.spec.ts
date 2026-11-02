import { originCheck } from './origin-check';

const check = originCheck('https://temerelle.vercel.app');

function run(method: string, headers: Record<string, string>) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  check({ method, headers } as any, res as any, next);
  return { passed: next.mock.calls.length === 1, res };
}

describe('originCheck', () => {
  it('lets reads through from anywhere', () => {
    expect(run('GET', { origin: 'https://evil.example' }).passed).toBe(true);
  });

  it('lets our own frontend change things', () => {
    expect(run('POST', { origin: 'https://temerelle.vercel.app', 'sec-fetch-site': 'same-origin' }).passed).toBe(true);
  });

  it('refuses a mutation from another site with 403 FORBIDDEN_ORIGIN', () => {
    const { passed, res } = run('POST', { origin: 'https://evil.example' });
    expect(passed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'FORBIDDEN_ORIGIN' }));
  });

  it('refuses a cross-site request even without Origin', () => {
    expect(run('DELETE', { 'sec-fetch-site': 'cross-site' }).passed).toBe(false);
  });

  it('lets a non-browser client (no Origin) through', () => {
    expect(run('POST', {}).passed).toBe(true);
  });
});
