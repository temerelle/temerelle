import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { clientIp } from '../common/client-ip';
import { AuthService } from './auth.service';
import { AuthGuard, type AuthUser } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import { clearAuthCookies, setAuthCookies } from './auth-cookies';
import { REFRESH_COOKIE } from './auth.constants';
import {
  DeleteAccountDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/auth.dto';

const refreshCookie = (req: Request) => (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];

// Web: tokens only in httpOnly cookies, never in the body (an XSS can't read them). Native bearer mode: TODO.md
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.register(dto, clientIp(req));
    setAuthCookies(res, tokens);
    return { user };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.login(dto, clientIp(req));
    setAuthCookies(res, tokens);
    return { user };
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotates the refresh cookie and issues a new access cookie' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const { user, tokens } = await this.auth.refresh(refreshCookie(req));
      setAuthCookies(res, tokens);
      return { user };
    } catch (err) {
      clearAuthCookies(res);
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(refreshCookie(req));
    clearAuthCookies(res);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  async me(@CurrentUser() user: AuthUser) {
    return { user: await this.auth.me(user.id) };
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return { user: await this.auth.updateProfile(user.id, dto) };
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Same answer whether the email exists or not. DEV: the link goes to the server log' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    await this.auth.forgotPassword(dto.email, clientIp(req));
    return { ok: true };
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.resetPassword(dto, clientIp(req));
    clearAuthCookies(res);
    return { ok: true };
  }

  @Delete('account')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  async deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.deleteAccount(user.id, dto);
    clearAuthCookies(res);
    return { ok: true };
  }
}
