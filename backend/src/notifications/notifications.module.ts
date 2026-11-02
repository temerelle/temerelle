import { Module } from '@nestjs/common';
import { PushService } from './push.service';

// Phase 6 adds subscriptions and the notification events; PushService is the Web Push (VAPID) channel
@Module({
  providers: [PushService],
  exports: [PushService],
})
export class NotificationsModule {}
