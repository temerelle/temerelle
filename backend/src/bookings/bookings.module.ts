import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { BookingsController, OwnerBookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [AuthModule, BusinessesModule],
  controllers: [BookingsController, OwnerBookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
