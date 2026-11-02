import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDivisibleBy, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Durations follow the 15-minute slot step; prices are in kopiyky (minor units), never floats
const DURATION = { min: 15, max: 720, step: 15 };
const MAX_PRICE_MINOR = 10_000_000;

export class CreateServiceDto {
  @ApiProperty({ example: 'Комплексна мийка' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ example: 60, description: '15–720, in 15-minute steps' })
  @Type(() => Number)
  @IsInt()
  @Min(DURATION.min)
  @Max(DURATION.max)
  @IsDivisibleBy(DURATION.step)
  durationMinutes: number;

  @ApiProperty({ example: 50000, description: 'Kopiyky: 50000 = 500 ₴' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_MINOR)
  priceMinor: number;
}

export class UpdateServiceDto {
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(DURATION.min)
  @Max(DURATION.max)
  @IsDivisibleBy(DURATION.step)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_MINOR)
  priceMinor?: number;

  @ApiPropertyOptional({ description: 'Off: not offered to clients; past bookings keep it' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListServicesQuery {
  @ApiPropertyOptional({ description: 'Owner only: also the switched-off services' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}
