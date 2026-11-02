import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { RateLimitService } from './rate-limit.service';
import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants';

@Module({
  imports: [
    // Factory: JWT_SECRET is read after validateEnv, not at import time
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL_SECONDS },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RateLimitService],
  // Other modules protect their routes with AuthGuard
  exports: [AuthGuard, JwtModule],
})
export class AuthModule {}
