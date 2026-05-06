import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CommentService } from './comment.service';
import { CreateCommentDto, ListCommentsQueryDto, UpdateCommentDto } from './dto/comment.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('tasks/:taskId/comments')
  list(
    @CurrentUser() userId: string,
    @Param('taskId') taskId: string,
    @Query() query: ListCommentsQueryDto,
  ) {
    return this.commentService.list(taskId, userId, query);
  }

  @Post('tasks/:taskId/comments')
  create(
    @CurrentUser() userId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.create(taskId, userId, dto);
  }

  @Patch('comments/:commentId')
  update(
    @CurrentUser() userId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentService.update(commentId, userId, dto);
  }

  @Delete('comments/:commentId')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('commentId') commentId: string) {
    return this.commentService.remove(commentId, userId);
  }
}
