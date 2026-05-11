import { IsBoolean, IsHexColor, IsIn, IsOptional, IsUUID } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsHexColor()
  themeColor?: string | null;

  @IsOptional()
  @IsUUID()
  backgroundImageFileId?: string | null;

  @IsOptional()
  @IsIn(['light', 'medium', 'strong'])
  backgroundOverlay?: 'light' | 'medium' | 'strong';

  @IsOptional()
  @IsBoolean()
  useSystemTheme?: boolean;
}
