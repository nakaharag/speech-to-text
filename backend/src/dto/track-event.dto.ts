import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class TrackEventDto {
  @IsString()
  @IsNotEmpty()
  shareId: string;

  @IsString()
  @IsIn(['view', 'copy_transcript', 'copy_link', 'share_twitter', 'share_facebook', 'share_whatsapp'])
  eventType: 'view' | 'copy_transcript' | 'copy_link' | 'share_twitter' | 'share_facebook' | 'share_whatsapp';
}
