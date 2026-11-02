import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ClockModule } from './clock/clock.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [DatabaseModule, ClockModule, HealthModule],
})
export class AppModule {}
