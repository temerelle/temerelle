import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { TEST_DATABASE_URL } from './env';

export interface TestApp {
  app: INestApplication;
  baseUrl: string;
  sql: Pool;
  close: () => Promise<void>;
}

// The whole app over real HTTP, as Vercel serves it
export async function startApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0);
  const sql = new Pool({ connectionString: TEST_DATABASE_URL });
  return {
    app,
    baseUrl: `${await app.getUrl()}/api/v1`,
    sql,
    close: async () => {
      await sql.end();
      await app.close();
    },
  };
}

let clients = 0;

// A browser's cookie jar for one client: sends what it has, keeps what Set-Cookie gives.
// Each client has its own IP, so per-IP rate limits don't leak between tests
export class Client {
  cookies = new Map<string, string>();
  readonly ip = `10.0.${Math.floor(++clients / 250)}.${clients % 250}`;

  constructor(
    private readonly baseUrl: string,
    private readonly origin = 'http://localhost:3000',
  ) {}

  async request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'x-forwarded-for': this.ip,
        ...(this.origin && { origin: this.origin }),
        ...(body !== undefined && { 'content-type': 'application/json' }),
        ...(this.cookies.size && { cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const line of res.headers.getSetCookie()) {
      const [pair, ...attributes] = line.split(';');
      const [name, value] = pair.split('=');
      const cleared = attributes.some((a) => /expires=Thu, 01 Jan 1970/i.test(a)) || value === '';
      if (cleared) this.cookies.delete(name.trim());
      else this.cookies.set(name.trim(), value);
    }
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as Record<string, any>, headers: res.headers };
  }

  get = (path: string) => this.request('GET', path);
  post = (path: string, body?: unknown) => this.request('POST', path, body);
  patch = (path: string, body?: unknown) => this.request('PATCH', path, body);
  delete = (path: string, body?: unknown) => this.request('DELETE', path, body);
}
