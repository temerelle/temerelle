import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, OptionalAuthGuard, type AuthUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BookingsService } from './bookings.service';
import {
  AvailabilityQuery,
  CreateBookingDto,
  CreateManualBookingDto,
  OwnerBookingsQuery,
  ReasonDto,
} from './dto/booking.dto';

// The client's side: free times, a request, their list, cancel
@ApiTags('bookings')
@Controller()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get('businesses/:id/availability')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "Free start times of a date for a service, in the business's time zone" })
  availability(
    @Param('id', ParseUUIDPipe) businessId: string,
    @Query() query: AvailabilityQuery,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.bookings.availability(businessId, query.serviceId, query.date, user?.id);
  }

  @Post('bookings')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Request a booking: pending until the owner confirms. 409 when the time is gone' })
  request(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookings.request(user.id, dto);
  }

  @Get('bookings/my')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: "The signed-in client's bookings: upcoming and recent past" })
  my(@CurrentUser() user: AuthUser) {
    return this.bookings.my(user.id);
  }

  @Post('bookings/:id/cancel')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Cancel: the client an upcoming booking of theirs, the owner any active one' })
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) bookingId: string, @Body() dto: ReasonDto) {
    return this.bookings.cancel(user.id, bookingId, dto.reason);
  }
}

// The owner's side of one business
@ApiTags('bookings')
@Controller('businesses/:id/bookings')
@UseGuards(AuthGuard)
@ApiCookieAuth()
export class OwnerBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'Bookings of the business from a date on (default today), with client details' })
  list(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) businessId: string,
    @Query() query: OwnerBookingsQuery,
  ) {
    return this.bookings.forOwner(user.id, businessId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Book someone by hand (a call, a walk-in): confirmed at once' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateManualBookingDto,
  ) {
    return this.bookings.createManual(user.id, businessId, dto);
  }

  @Post(':bookingId/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'pending → confirmed, before the start only' })
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) businessId: string,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    return this.bookings.confirm(user.id, businessId, bookingId);
  }

  @Post(':bookingId/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'pending → cancelled by the owner, with an optional reason' })
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) businessId: string,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() dto: ReasonDto,
  ) {
    return this.bookings.reject(user.id, businessId, bookingId, dto.reason);
  }
}
