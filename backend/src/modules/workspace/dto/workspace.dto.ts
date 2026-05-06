import { IsEnum, IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { WorkspaceRole } from '../workspace-member.entity';

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}

export class UpdateWorkspaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(['admin', 'member'])
  role: 'admin' | 'member';
}

export class UpdateMemberRoleDto {
  @IsEnum(['admin', 'member'])
  role: 'admin' | 'member';
}
