import { ConflictException, Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { configureApp } from '../configure-app';
import { API_ERRORS, apiError } from './api-error';

@Controller()
class FailingController {
  @Get('taken')
  taken() {
    throw new ConflictException(apiError('BOOKING_CONFLICT'));
  }

  @Get('taken-reworded')
  takenReworded() {
    throw new ConflictException(apiError('BOOKING_CONFLICT', 'Someone booked this time first'));
  }
}

describe('apiError', () => {
  it('keeps the English message as the exception message (logs, tests)', () => {
    expect(new ConflictException(apiError('BOOKING_CONFLICT')).message).toBe('Time is already taken');
  });

  it('every code has a message', () => {
    for (const message of Object.values(API_ERRORS)) expect(message).toMatch(/\w/);
  });
});

// The JSON body the frontend actually receives
describe('an error with a code over HTTP', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [FailingController] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0);
    baseUrl = `${await app.getUrl()}/api/v1`;
  });

  afterAll(() => app.close());

  it('answers 409 with { code, message }', async () => {
    const res = await fetch(`${baseUrl}/taken`);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ code: 'BOOKING_CONFLICT', message: 'Time is already taken' });
  });

  it("a place's own wording keeps the same code", async () => {
    const res = await fetch(`${baseUrl}/taken-reworded`);
    expect(await res.json()).toEqual({ code: 'BOOKING_CONFLICT', message: 'Someone booked this time first' });
  });
});
