import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{3,8}$/)
  color?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{3,8}$/)
  color?: string;
}

export class AddProjectMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(['admin', 'member'])
  role: 'admin' | 'member';
}
