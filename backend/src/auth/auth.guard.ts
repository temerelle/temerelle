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

type AuthRequest = Request & { user?: AuthUser };

// Web sends the cookie, a native app the Bearer header
async function userFromRequest(jwt: JwtService, req: AuthRequest): Promise<AuthUser | undefined> {
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  const token = bearer ?? (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];
  if (!token) return undefined;
  try {
    const payload = await jwt.verifyAsync<AccessTokenPayload>(token, { algorithms: ['HS256'] });
    return { id: payload.sub, sessionId: payload.sid };
  } catch {
    return undefined;
  }
}

// Stateless: verifies the access token's signature and expiry, no database call. A signed-out session's
// access token lives on for at most ACCESS_TOKEN_TTL_SECONDS
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    req.user = await userFromRequest(this.jwt, req);
    if (!req.user) throw new UnauthorizedException();
    return true;
  }
}

// Public routes that show the owner more (inactive services): req.user is set when the token is valid, else left out
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    req.user = await userFromRequest(this.jwt, req);
    return true;
  }
}
