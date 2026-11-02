import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsISO8601, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { BOOKING_STATUSES } from '../../database/schema';
import { optionalPhone, PHONE_PATTERN } from '../../auth/dto/auth.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class AvailabilityQuery {
  @ApiProperty()
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: '2026-11-10', description: "A date in the business's time zone" })
  @Matches(DATE, { message: 'date: YYYY-MM-DD' })
  @IsDateString()
  date: string;
}

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  businessId: string;

  @ApiProperty()
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: '2026-11-10T08:00:00.000Z', description: 'One of the startsAt the availability gave' })
  @IsISO8601({ strict: true })
  startsAt: string;
}

// The owner books someone who called: any future time, confirmed at once. Date and time as on the
// business's clock, so the owner's device needs no time zone math
export class CreateManualBookingDto {
  @ApiProperty()
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: '2026-11-10' })
  @Matches(DATE, { message: 'date: YYYY-MM-DD' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '10:30' })
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, { message: 'time: HH:MM' })
  time: string;

  @ApiProperty({ example: 'Олена' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  clientName: string;

  @ApiPropertyOptional({ example: '+380 67 123 45 67' })
  @Transform(optionalPhone)
  @IsOptional()
  @Matches(PHONE_PATTERN)
  clientPhone?: string | null;
}

export class ReasonDto {
  @ApiPropertyOptional({ example: 'Захворіла' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(0, 300)
  reason?: string;
}

export class OwnerBookingsQuery {
  @ApiPropertyOptional({ example: '2026-11-10', description: 'From this date on (business time zone). Default: today' })
  @IsOptional()
  @Matches(DATE, { message: 'from: YYYY-MM-DD' })
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-10', description: 'Up to and including this date' })
  @IsOptional()
  @Matches(DATE, { message: 'to: YYYY-MM-DD' })
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: BOOKING_STATUSES })
  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: (typeof BOOKING_STATUSES)[number];
}
