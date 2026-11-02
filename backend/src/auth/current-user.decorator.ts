import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './auth.guard';

// Behind AuthGuard: always set. Behind OptionalAuthGuard: undefined for a visitor
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
});
