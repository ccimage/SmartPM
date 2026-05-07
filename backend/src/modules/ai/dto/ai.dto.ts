import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GenerateTasksDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  input: string;
}

export class SplitRequirementDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  input: string;
}

export class DailySummaryDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export class ImportTaskItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

export class ImportTasksDto {
  tasks: ImportTaskItemDto[];
}

export class ListAiLogsQueryDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
