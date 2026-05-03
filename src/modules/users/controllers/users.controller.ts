import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { User } from '../entities/user.entity';
import {
  ApiOkWrappedResponse,
  ApiBadRequestWrappedResponse,
  ApiUnauthorizedWrappedResponse,
} from '../../../common/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ResponseMessage('Profile retrieved')
  @ApiOkWrappedResponse(UserResponseDto)
  @ApiUnauthorizedWrappedResponse()
  getProfile(@CurrentUser() user: User) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  @ResponseMessage('Profile updated')
  @ApiOkWrappedResponse(UserResponseDto)
  @ApiBadRequestWrappedResponse()
  @ApiUnauthorizedWrappedResponse()
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.id, dto);
  }
}
