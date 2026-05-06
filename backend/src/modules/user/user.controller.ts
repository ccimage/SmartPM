import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserService } from './user.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@CurrentUser() userId: string, @Body() dto: UpdateMeDto) {
    const user = await this.userService.updateMe(userId, dto);
    return user.toProfile();
  }
}
