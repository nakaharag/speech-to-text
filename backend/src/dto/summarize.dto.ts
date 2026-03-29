import { IsString, IsNotEmpty } from 'class-validator';

export class SummarizeDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
