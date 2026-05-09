import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FileService, type UploadedFileData } from './file.service';
import { AttachFileDto } from './dto/file.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('files/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  upload(
    @CurrentUser() userId: string,
    @UploadedFile() file: UploadedFileData,
  ) {
    return this.fileService.upload(file, userId);
  }

  @Post('files/:fileId/attach')
  attach(
    @CurrentUser() userId: string,
    @Param('fileId') fileId: string,
    @Body() dto: AttachFileDto,
  ) {
    return this.fileService.attach(fileId, userId, dto);
  }

  @Get('tasks/:taskId/files')
  listByTask(@CurrentUser() userId: string, @Param('taskId') taskId: string) {
    return this.fileService.listByTask(taskId, userId);
  }

  @Delete('files/:fileId/attach')
  @HttpCode(204)
  removeAttachment(
    @CurrentUser() userId: string,
    @Param('fileId') fileId: string,
    @Body() dto: AttachFileDto,
  ) {
    return this.fileService.removeAttachment(fileId, userId, dto);
  }
}
