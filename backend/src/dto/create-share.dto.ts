import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateShareDto {
  @IsString()
  @IsNotEmpty()
  transcript: string;

  @IsString()
  @IsOptional()
  corrected?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  @IsIn(['24h', '7d', '30d', 'never'])
  expiration?: '24h' | '7d' | '30d' | 'never';

  @IsString()
  @IsOptional()
  audioKey?: string;
}

export class VerifySharePasswordDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
