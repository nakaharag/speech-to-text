import { IsOptional, IsString, IsIn, IsNumber, Min, Max } from 'class-validator';

export class ConvertPdfDto {
  @IsOptional()
  @IsString()
  @IsIn(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
  voice?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(4.0)
  speed?: number;
}
