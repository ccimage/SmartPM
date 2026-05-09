import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import type { FileRelationEntityType } from '../entities/file-relation.entity';

export class AttachFileDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['task', 'comment'])
  entityType: FileRelationEntityType;

  @IsUUID('all')
  entityId: string;
}
