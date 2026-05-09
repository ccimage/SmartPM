import { Body, Controller, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserService } from './user.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@CurrentUser() userId: string, @Body() dto: UpdateMeDto) {
    const user = await this.userService.updateMe(userId, dto);
    return user.toProfile();
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/password')
  @HttpCode(204)
  changePassword(@CurrentUser() userId: string, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(userId, dto.oldPassword, dto.newPassword);
  }
}
