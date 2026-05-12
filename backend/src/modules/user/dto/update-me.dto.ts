import { IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @ValidateIf((o) => o.avatarUrl !== null)
  @IsUrl()
  @MaxLength(500)
  avatarUrl?: string | null;
}
