import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserService } from './user.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@CurrentUser() userId: string, @Body() dto: UpdateMeDto) {
    const user = await this.userService.updateMe(userId, dto);
    const preferences = await this.userService.findPreferencesByUserId(userId);
    return user.toProfile(preferences);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/preferences')
  getPreferences(@CurrentUser() userId: string) {
    return this.userService.getPreferences(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/preferences')
  updatePreferences(@CurrentUser() userId: string, @Body() dto: UpdatePreferencesDto) {
    return this.userService.updatePreferences(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/password')
  @HttpCode(204)
  changePassword(@CurrentUser() userId: string, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(userId, dto.oldPassword, dto.newPassword);
  }
}
