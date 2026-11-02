import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('ok when the database answers', async () => {
    const controller = new HealthController({ ping: jest.fn().mockResolvedValue(undefined) } as any);
    await expect(controller.check()).resolves.toEqual({ status: 'ok', database: 'ok' });
  });

  it('503 when the database is unreachable', async () => {
    const controller = new HealthController({ ping: jest.fn().mockRejectedValue(new Error('down')) } as any);
    (controller as any).logger = { error: jest.fn() };
    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
