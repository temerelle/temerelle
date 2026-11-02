import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, OptionalAuthGuard, type AuthUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ScheduleService } from './schedule.service';
import { CreateExceptionDto, PutScheduleDto } from './dto/schedule.dto';

@ApiTags('schedule')
@Controller('businesses/:id')
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get('schedule')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Weekly working hours, Monday first' })
  get(@Param('id', ParseUUIDPipe) businessId: string, @CurrentUser() user: AuthUser | undefined) {
    return this.schedule.get(businessId, user?.id);
  }

  @Put('schedule')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Replace the whole week. Existing bookings are kept' })
  put(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) businessId: string, @Body() dto: PutScheduleDto) {
    return this.schedule.put(user.id, businessId, dto);
  }

  @Get('exceptions')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Date overrides from today on, one item per date' })
  list(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) businessId: string) {
    return this.schedule.listExceptions(user.id, businessId);
  }

  @Post('exceptions')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Set the override of a date (day off, or its own hours), replacing the previous one' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateExceptionDto,
  ) {
    return this.schedule.setException(user.id, businessId, dto);
  }

  @Delete('exceptions/:exceptionId')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Remove a date's override: that date follows the weekly schedule again" })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) businessId: string,
    @Param('exceptionId', ParseUUIDPipe) exceptionId: string,
  ) {
    return this.schedule.deleteException(user.id, businessId, exceptionId);
  }
}
