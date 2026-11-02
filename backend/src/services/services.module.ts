import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [AuthModule, BusinessesModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
