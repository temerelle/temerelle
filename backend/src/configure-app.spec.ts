import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { configureApp } from './configure-app';

@Controller()
class PingController {
  @Get('ping')
  ping() {
    return { ok: true };
  }
}

// Real HTTP round trip; both entrypoints use configureApp, so this is what Vercel serves
describe('configureApp', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [PingController] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(() => app.close());

  it('serves routes under /api/v1', async () => {
    expect((await fetch(`${baseUrl}/api/v1/ping`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/ping`)).status).toBe(404);
  });

  it('sends helmet headers and hides the framework', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ping`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(res.headers.get('strict-transport-security')).toContain('max-age=');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(res.headers.get('x-powered-by')).toBeNull();
  });

  it('serves the OpenAPI document, the docs page without CSP', async () => {
    const json = await fetch(`${baseUrl}/api/v1/docs-json`);
    expect(json.status).toBe(200);
    expect(((await json.json()) as { info: { title: string } }).info.title).toBe('Temerelle API');

    const page = await fetch(`${baseUrl}/api/v1/docs`);
    expect(page.status).toBe(200);
    expect(page.headers.get('content-security-policy')).toBeNull();
  });
});
