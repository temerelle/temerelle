import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, OptionalAuthGuard, type AuthUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ServicesService } from './services.service';
import { CreateServiceDto, ListServicesQuery, UpdateServiceDto } from './dto/service.dto';

@ApiTags('services')
@Controller('businesses/:id/services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  list(
    @Param('id', ParseUUIDPipe) businessId: string,
    @Query() query: ListServicesQuery,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.services.list(businessId, user?.id, query.includeInactive);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  create(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) businessId: string, @Body() dto: CreateServiceDto) {
    return this.services.create(user.id, businessId, dto);
  }

  @Patch(':serviceId')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) businessId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.services.update(user.id, businessId, serviceId, dto);
  }
}
