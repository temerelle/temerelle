import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, gt, isNull, lt, or } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { passwordResetTokens, sessions, users } from '../database/schema';
import { ClockService } from '../clock/clock.service';
import { apiError } from '../common/api-error';
import { hashToken, newToken } from './token';
import { hashPassword, passwordMatches } from './password';
import { RateLimitService } from './rate-limit.service';
import type { AccessTokenPayload } from './auth.guard';
import { RATE_LIMITS, REFRESH_TOKEN_TTL_DAYS, RESET_TOKEN_TTL_MINUTES, ROTATION_GRACE_SECONDS } from './auth.constants';
import type { DeleteAccountDto, LoginDto, RegisterDto, ResetPasswordDto, UpdateProfileDto } from './dto/auth.dto';

type Db = DatabaseService['db'];
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserView {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  createdAt: Date;
}

const userView = { id: users.id, email: users.email, name: users.name, phone: users.phone, createdAt: users.createdAt };

// Expired or revoked sessions are kept this long, so a recent sign-in / sign-out can be looked up
const DEAD_SESSIONS_KEPT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Postgres error codes
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const pgCode = (err: unknown) =>
  (err as { cause?: { code?: string }; code?: string }).cause?.code ?? (err as { code?: string }).code;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly jwt: JwtService,
    private readonly clock: ClockService,
    private readonly rateLimit: RateLimitService,
  ) {}

  private get db() {
    return this.database.db;
  }

  private now() {
    return this.clock.now().toJSDate();
  }

  async register(dto: RegisterDto, ip: string): Promise<{ user: UserView; tokens: Tokens }> {
    await this.rateLimit.hit(`register:${ip}`, RATE_LIMITS.registerPerIp);
    const passwordHash = await hashPassword(dto.password);
    try {
      return await this.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({ email: dto.email, name: dto.name, phone: dto.phone ?? null, passwordHash })
          .returning(userView);
        return { user, tokens: await this.issueSession(tx, user.id) };
      });
    } catch (err) {
      if (pgCode(err) === UNIQUE_VIOLATION) throw new ConflictException(apiError('EMAIL_TAKEN'));
      throw err;
    }
  }

  async login(dto: LoginDto, ip: string): Promise<{ user: UserView; tokens: Tokens }> {
    await this.rateLimit.hit(`login:ip:${ip}`, RATE_LIMITS.loginPerIp);
    await this.rateLimit.hit(`login:email:${dto.email}`, RATE_LIMITS.loginPerEmail);

    const [row] = await this.db
      .select({ ...userView, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);
    // Verify first, even without a row: the same work either way
    const matches = await passwordMatches(dto.password, row?.passwordHash);
    if (!row || !matches) throw new UnauthorizedException(apiError('INVALID_CREDENTIALS'));

    await this.pruneDeadSessions();
    await this.rateLimit.prune();
    const user: UserView = { id: row.id, email: row.email, name: row.name, phone: row.phone, createdAt: row.createdAt };
    return { user, tokens: await this.issueSession(this.db, user.id) };
  }

  // Rotation: the presented refresh token is revoked and a new pair issued. A token that was already rotated
  // and comes back after the grace period was copied: every session of that user is revoked
  async refresh(rawRefreshToken: string | undefined): Promise<{ user: UserView; tokens: Tokens }> {
    const expired = () => new UnauthorizedException(apiError('SESSION_EXPIRED'));
    if (!rawRefreshToken) throw expired();
    const now = this.now();

    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, hashToken(rawRefreshToken)))
      .limit(1);
    if (!session || session.expiresAt <= now) throw expired();

    if (session.revokedAt) {
      if (session.rotatedAt && now.getTime() - session.rotatedAt.getTime() > ROTATION_GRACE_SECONDS * 1000) {
        this.logger.warn(`Refresh token reuse for user ${session.userId}: all sessions revoked`);
        await this.revokeAllSessions(this.db, session.userId);
      }
      throw expired();
    }

    return this.db.transaction(async (tx) => {
      // Compare-and-set: of two concurrent refreshes with the same token, only one rotates
      const rotated = await tx
        .update(sessions)
        .set({ revokedAt: now, rotatedAt: now })
        .where(and(eq(sessions.id, session.id), isNull(sessions.revokedAt)))
        .returning({ id: sessions.id });
      if (rotated.length === 0) throw expired();

      const [user] = await tx.select(userView).from(users).where(eq(users.id, session.userId)).limit(1);
      if (!user) throw expired();
      return { user, tokens: await this.issueSession(tx, user.id) };
    });
  }

  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) return;
    await this.db
      .update(sessions)
      .set({ revokedAt: this.now() })
      .where(and(eq(sessions.tokenHash, hashToken(rawRefreshToken)), isNull(sessions.revokedAt)));
  }

  async me(userId: string): Promise<UserView> {
    const [user] = await this.db.select(userView).from(users).where(eq(users.id, userId)).limit(1);
    // The account was deleted while the access token was still valid
    if (!user) throw new UnauthorizedException(apiError('SESSION_EXPIRED'));
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserView> {
    const changes = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
    };
    if (Object.keys(changes).length === 0) return this.me(userId);
    const [user] = await this.db.update(users).set(changes).where(eq(users.id, userId)).returning(userView);
    if (!user) throw new UnauthorizedException(apiError('SESSION_EXPIRED'));
    return user;
  }

  // Always answers the same, whether the email exists or not
  async forgotPassword(email: string, ip: string) {
    await this.rateLimit.hit(`forgot:ip:${ip}`, RATE_LIMITS.forgotPerIp);
    await this.rateLimit.hit(`forgot:email:${email}`, RATE_LIMITS.forgotPerEmail);

    const [user] = await this.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (!user) return;

    const token = newToken();
    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(this.now().getTime() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    });
    // DEV ONLY until email delivery exists (TODO.md): the link is the only way to reset
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    this.logger.warn(`[DEV ONLY] Password reset link for ${email}: ${link}`);
  }

  // One use; every session of the user ends, so a thief signed in with the old password is out
  async resetPassword(dto: ResetPasswordDto, ip: string) {
    await this.rateLimit.hit(`reset:ip:${ip}`, RATE_LIMITS.resetPerIp);
    const passwordHash = await hashPassword(dto.password);
    const now = this.now();

    await this.db.transaction(async (tx) => {
      const [used] = await tx
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(
          and(
            eq(passwordResetTokens.tokenHash, hashToken(dto.token)),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, now),
          ),
        )
        .returning({ userId: passwordResetTokens.userId });
      if (!used) throw new BadRequestException(apiError('INVALID_RESET_TOKEN'));

      await tx.update(users).set({ passwordHash }).where(eq(users.id, used.userId));
      // Other links sent earlier stop working too
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(and(eq(passwordResetTokens.userId, used.userId), isNull(passwordResetTokens.usedAt)));
      await this.revokeAllSessions(tx, used.userId);
    });
  }

  // Bookings keep the client's name and snapshots (client_id becomes NULL). An owner can't leave businesses
  // without an owner: the foreign key refuses, whatever was created in between
  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const [row] = await this.db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) throw new UnauthorizedException(apiError('SESSION_EXPIRED'));
    if (!(await passwordMatches(dto.password, row.passwordHash)))
      throw new ForbiddenException(apiError('WRONG_PASSWORD'));

    try {
      await this.db.delete(users).where(eq(users.id, userId));
    } catch (err) {
      if (pgCode(err) === FOREIGN_KEY_VIOLATION) throw new ConflictException(apiError('OWNER_HAS_BUSINESSES'));
      throw err;
    }
  }

  private async issueSession(tx: Db | Tx, userId: string): Promise<Tokens> {
    const refreshToken = newToken();
    const [session] = await tx
      .insert(sessions)
      .values({
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(this.now().getTime() + REFRESH_TOKEN_TTL_DAYS * DAY_MS),
      })
      .returning({ id: sessions.id });
    const payload: AccessTokenPayload = { sub: userId, sid: session.id };
    return { accessToken: await this.jwt.signAsync(payload), refreshToken };
  }

  private async revokeAllSessions(tx: Db | Tx, userId: string) {
    await tx
      .update(sessions)
      .set({ revokedAt: this.now() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  private async pruneDeadSessions() {
    const before = new Date(this.now().getTime() - DEAD_SESSIONS_KEPT_DAYS * DAY_MS);
    await this.db.delete(sessions).where(or(lt(sessions.expiresAt, before), lt(sessions.revokedAt, before)));
  }
}
