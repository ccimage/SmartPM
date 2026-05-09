import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { File } from './entities/file.entity';
import { FileRelation } from './entities/file-relation.entity';
import { AttachFileDto } from './dto/file.dto';
import { TaskService } from '../task/task.service';
import { ProjectService } from '../project/project.service';
import { Comment } from '../comment/comment.entity';
import { StorageService } from '../../infra/storage/storage.service';

export interface UploadedFileData {
  originalname: string;
  size: number;
  mimetype: string;
  buffer: Buffer;
}

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,
    @InjectRepository(FileRelation)
    private readonly relationRepo: Repository<FileRelation>,
    private readonly taskService: TaskService,
    private readonly projectService: ProjectService,
    private readonly storageService: StorageService,
  ) {}

  async upload(file: UploadedFileData | undefined, userId: string) {
    if (!file) throw new BadRequestException('File is required');

    const key = `uploads/${Date.now()}-${randomUUID()}-${file.originalname}`;
    const url = await this.storageService.upload(key, file.buffer, file.mimetype);

    const saved = await this.fileRepo.save(
      this.fileRepo.create({
        url,
        filename: file.originalname,
        size: String(file.size),
        mimeType: file.mimetype,
        storageKey: key,
        uploadedBy: userId,
      }),
    );

    return this.toFileSummary(saved);
  }

  async attach(fileId: string, userId: string, dto: AttachFileDto) {
    await this.loadFile(fileId);
    await this.requireEntityAccess(dto.entityType, dto.entityId, userId);

    const relation = await this.relationRepo.save(
      this.relationRepo.create({
        fileId,
        entityType: dto.entityType,
        entityId: dto.entityId,
      }),
    );

    return {
      id: relation.id,
      fileId: relation.fileId,
      entityType: relation.entityType,
      entityId: relation.entityId,
    };
  }

  async listByTask(taskId: string, userId: string) {
    const task = await this.taskService.loadTaskForComment(taskId);
    await this.projectService.requireProjectMember(task.projectId, userId);

    const relations = await this.relationRepo.find({
      where: { entityType: 'task', entityId: taskId },
      relations: ['file', 'file.uploader'],
    });

    return relations.map((r) => ({
      id: r.file.id,
      url: r.file.url,
      filename: r.file.filename,
      size: r.file.size,
      mimeType: r.file.mimeType,
      uploadedBy: {
        id: r.file.uploader.id,
        name: r.file.uploader.name,
      },
      createdAt: r.file.createdAt,
    }));
  }

  async removeAttachment(fileId: string, userId: string, dto: AttachFileDto) {
    await this.loadFile(fileId);
    await this.requireEntityAccess(dto.entityType, dto.entityId, userId);

    const relation = await this.relationRepo.findOne({
      where: {
        fileId,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });

    if (!relation) throw new NotFoundException('File attachment not found');
    await this.relationRepo.delete(relation.id);
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private async loadFile(fileId: string): Promise<File> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  private async requireEntityAccess(entityType: string, entityId: string, userId: string) {
    if (entityType === 'task') {
      const task = await this.taskService.loadTaskForComment(entityId);
      await this.projectService.requireProjectMember(task.projectId, userId);
      return;
    }

    if (entityType === 'comment') {
      const comment = await this.relationRepo.manager.getRepository(Comment).findOne({
        where: { id: entityId },
      });
      if (!comment) throw new NotFoundException('Comment not found');

      const task = await this.taskService.loadTaskForComment(comment.taskId);
      await this.projectService.requireProjectMember(task.projectId, userId);
      return;
    }

    throw new BadRequestException('Unsupported entity type');
  }

  private toFileSummary(file: File) {
    return {
      id: file.id,
      url: file.url,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimeType,
    };
  }
}
