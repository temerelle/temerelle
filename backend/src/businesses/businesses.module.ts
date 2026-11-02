import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { BusinessAccessService } from './business-access.service';

@Module({
  imports: [AuthModule],
  controllers: [BusinessesController],
  providers: [BusinessesService, BusinessAccessService],
  // Services and schedule check ownership through it
  exports: [BusinessAccessService],
})
export class BusinessesModule {}
