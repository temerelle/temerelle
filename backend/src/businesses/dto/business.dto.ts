import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotIn, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';
import { CODE_PATTERN, RESERVED_CODES } from '../business-code';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const CODE_HINT = '3–32 characters: a-z, 0-9 and dashes, not at the ends';

export class CreateBusinessDto {
  @ApiProperty({ example: 'AquaWash' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ example: 'Мийка біля ТРЦ, 2 хвилини від метро' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'aquawash', description: `Made from the name if left out. ${CODE_HINT}` })
  @Transform(lower)
  @IsOptional()
  @Matches(CODE_PATTERN, { message: `code: ${CODE_HINT}` })
  @IsNotIn([...RESERVED_CODES])
  code?: string;
}

export class UpdateBusinessDto {
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: CODE_HINT })
  @Transform(lower)
  @IsOptional()
  @Matches(CODE_PATTERN, { message: `code: ${CODE_HINT}` })
  @IsNotIn([...RESERVED_CODES])
  code?: string;

  @ApiPropertyOptional({ description: 'Off: hidden from search, no new bookings' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Europe/Kyiv', description: 'IANA time zone' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}

export class SearchBusinessesQuery {
  @ApiPropertyOptional({ description: 'Name or code, 2+ characters' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
}
