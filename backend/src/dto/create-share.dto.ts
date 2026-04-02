import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

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
}
