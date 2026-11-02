import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
// Empty string = no phone
export const optionalPhone = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : (value as null | undefined);

// Upper bound keeps Argon2 work per request bounded
const PASSWORD = { min: 8, max: 128 };
export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

export class RegisterDto {
  @ApiProperty({ example: 'olena@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ minLength: PASSWORD.min, maxLength: PASSWORD.max })
  @IsString()
  @Length(PASSWORD.min, PASSWORD.max)
  password: string;

  @ApiProperty({ example: 'Олена' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ example: '+380 67 123 45 67', nullable: true })
  @Transform(optionalPhone)
  @IsOptional()
  @Matches(PHONE_PATTERN)
  phone?: string | null;
}

export class LoginDto {
  @ApiProperty({ example: 'olena@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MaxLength(PASSWORD.max)
  password: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(optionalPhone)
  @IsOptional()
  @Matches(PHONE_PATTERN)
  phone?: string | null;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  token: string;

  @ApiProperty({ minLength: PASSWORD.min, maxLength: PASSWORD.max })
  @IsString()
  @Length(PASSWORD.min, PASSWORD.max)
  password: string;
}

export class DeleteAccountDto {
  @ApiProperty()
  @IsString()
  @MaxLength(PASSWORD.max)
  password: string;
}
