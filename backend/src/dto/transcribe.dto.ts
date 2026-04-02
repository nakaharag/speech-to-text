import { IsString, IsOptional } from 'class-validator';

export class TranscribeDto {
  @IsString()
  @IsOptional()
  language?: string;
}
