import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateShareDto {
  @IsString()
  @IsNotEmpty()
  transcript: string;

  @IsString()
  @IsOptional()
  summary?: string;
}
