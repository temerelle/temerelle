import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, OptionalAuthGuard, type AuthUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto, SearchBusinessesQuery, UpdateBusinessDto } from './dto/business.dto';

@ApiTags('businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get()
  @ApiOperation({ summary: 'Search active businesses by name or code' })
  search(@Query() query: SearchBusinessesQuery) {
    return this.businesses.search(query.q, query.page);
  }

  // Before :idOrCode, or "mine" would be taken for a code
  @Get('mine')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: "The signed-in user's own businesses, active or not" })
  async mine(@CurrentUser() user: AuthUser) {
    return { items: await this.businesses.mine(user.id) };
  }

  @Get(':idOrCode')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Public profile by id or code; an inactive one only to its owner' })
  profile(@Param('idOrCode') idOrCode: string, @CurrentUser() user: AuthUser | undefined) {
    return this.businesses.profile(idOrCode, user?.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create a business; its default resource is created with it' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBusinessDto) {
    return this.businesses.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBusinessDto) {
    return this.businesses.update(user.id, id, dto);
  }
}
