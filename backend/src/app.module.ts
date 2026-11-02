import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ClockModule } from './clock/clock.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { BusinessesModule } from './businesses/businesses.module';
import { ServicesModule } from './services/services.module';
import { ScheduleModule } from './schedule/schedule.module';
import { BookingsModule } from './bookings/bookings.module';

@Module({
  imports: [
    DatabaseModule,
    ClockModule,
    HealthModule,
    AuthModule,
    BusinessesModule,
    ServicesModule,
    ScheduleModule,
    BookingsModule,
  ],
})
export class AppModule {}
