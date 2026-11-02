import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ACCESS_COOKIE } from './auth.constants';

export interface AuthUser {
  id: string;
  sessionId: string;
}

export interface AccessTokenPayload {
  sub: string;
  sid: string;
}

// Stateless: verifies the access token's signature and expiry, no database call. A signed-out session's
// access token lives on for at most ACCESS_TOKEN_TTL_SECONDS. Web sends the cookie, a native app the Bearer header
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    const token = bearer ?? (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];
    if (!token) throw new UnauthorizedException();

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, { algorithms: ['HS256'] });
      req.user = { id: payload.sub, sessionId: payload.sid };
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
