import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_INTERVALS_PER_DAY, TIME_PATTERN } from '../rules';

export class IntervalDto {
  @ApiProperty({ example: '09:00' })
  @Matches(TIME_PATTERN, { message: 'start: HH:MM' })
  start: string;

  @ApiProperty({ example: '18:00', description: "HH:MM; '24:00' for the end of the day" })
  @Matches(TIME_PATTERN, { message: 'end: HH:MM' })
  end: string;
}

export class DayDto {
  @ApiProperty({ example: 1, description: '1 = Monday … 7 = Sunday' })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @ApiProperty({ type: [IntervalDto], description: 'Empty = day off. Gaps between intervals are breaks' })
  @IsArray()
  @ArrayMaxSize(MAX_INTERVALS_PER_DAY)
  @ValidateNested({ each: true })
  @Type(() => IntervalDto)
  intervals: IntervalDto[];
}

export class PutScheduleDto {
  @ApiProperty({ type: [DayDto], description: 'The whole week; a day left out is a day off' })
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DayDto)
  days: DayDto[];
}

export class CreateExceptionDto {
  @ApiProperty({ example: '2026-12-31' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date: YYYY-MM-DD' })
  date: string;

  @ApiProperty({ description: 'true: closed that day. false: the intervals replace the usual hours' })
  @IsBoolean()
  isDayOff: boolean;

  @ApiPropertyOptional({ type: [IntervalDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_INTERVALS_PER_DAY)
  @ValidateNested({ each: true })
  @Type(() => IntervalDto)
  intervals?: IntervalDto[];
}
