import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { AuthTokensDto, AuthRegisterResponseDto } from '../dto/auth-tokens.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { GoogleAuthDto } from '../dto/google-auth.dto';
import { MessageResponseDto } from '../../../common/dto/message-response.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { JwtRefreshGuard } from '../../../common/guards/jwt-refresh.guard';
import {
  ApiCreatedWrappedResponse,
  ApiOkWrappedResponse,
  ApiBadRequestWrappedResponse,
  ApiUnauthorizedWrappedResponse,
  ApiConflictWrappedResponse,
} from '../../../common/swagger';

interface RefreshUser {
  id: string;
  email: string;
  refreshToken: string;
}

@ApiTags('Auth')
@Throttle({ default: { ttl: 60000, limit: 10 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Signed in with Google')
  @ApiOkWrappedResponse(AuthTokensDto)
  @ApiBadRequestWrappedResponse()
  @ApiUnauthorizedWrappedResponse()
  googleSignIn(@Body() dto: GoogleAuthDto) {
    return this.authService.googleSignIn(dto.idToken);
  }

  @Public()
  @Post('register')
  @ResponseMessage('Registration successful. Please verify your email.')
  @ApiCreatedWrappedResponse(AuthRegisterResponseDto)
  @ApiBadRequestWrappedResponse()
  @ApiConflictWrappedResponse()
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Login successful')
  @ApiOkWrappedResponse(AuthTokensDto)
  @ApiBadRequestWrappedResponse()
  @ApiUnauthorizedWrappedResponse()
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Tokens refreshed')
  @ApiOkWrappedResponse(AuthTokensDto)
  @ApiUnauthorizedWrappedResponse()
  refresh(@CurrentUser() user: RefreshUser) {
    return this.authService.refreshTokens(user.id, user.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ResponseMessage('Logged out successfully')
  @ApiOkWrappedResponse(MessageResponseDto)
  @ApiUnauthorizedWrappedResponse()
  async logout(@CurrentUser() user: { id: string }, @Req() req: Request) {
    await this.authService.logout(user.id, req.tokenJti, req.tokenExp);
    return { message: 'Logged out successfully' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ResponseMessage('Password changed successfully')
  @ApiOkWrappedResponse(MessageResponseDto)
  @ApiBadRequestWrappedResponse()
  @ApiUnauthorizedWrappedResponse()
  async changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Email verified successfully')
  @ApiOkWrappedResponse(MessageResponseDto)
  @ApiBadRequestWrappedResponse()
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.otp);
    return { message: 'Email verified successfully' };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Verification code resent')
  @ApiOkWrappedResponse(MessageResponseDto)
  @ApiBadRequestWrappedResponse()
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto.email);
    return { message: 'If your email is unverified, a new code has been sent' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Reset email sent if account exists')
  @ApiOkWrappedResponse(MessageResponseDto)
  @ApiBadRequestWrappedResponse()
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If that email exists, a reset link has been sent' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Password reset successful')
  @ApiOkWrappedResponse(MessageResponseDto)
  @ApiBadRequestWrappedResponse()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: 'Password reset successful' };
  }
}
