import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, CookieOptions } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto, VerifyMfaDto } from './dto/auth.dto.js';
import { Public, CurrentUser } from '../common/decorators/index.js';

@ApiTags('Auth — Autenticación y Sesiones')
@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;

  constructor(
    private auth: AuthService,
    private config: ConfigService,
  ) {
    const isProduction = this.config.get('NODE_ENV') === 'production';
    this.cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Autentica al usuario con email y contraseña. Si MFA está habilitado, retorna un token temporal para verificación TOTP.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Login exitoso — retorna accessToken (refreshToken en cookie httpOnly)',
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({
    status: 403,
    description: 'Cuenta bloqueada por exceso de intentos fallidos',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password);
    if ('refreshToken' in result) {
      res.cookie('refreshToken', result.refreshToken, this.cookieOptions);
      const { refreshToken: _, ...body } = result;
      return body;
    }
    return result; // MFA requerido, retorna tempToken
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar access token',
    description:
      'Lee el refresh token desde la cookie httpOnly y genera un nuevo par de tokens (rotación).',
  })
  @ApiResponse({ status: 200, description: 'Token renovado exitosamente' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No refresh token' });
      return;
    }
    const result = await this.auth.refresh(refreshToken);
    res.cookie('refreshToken', result.refreshToken, this.cookieOptions);
    const { refreshToken: _, ...body } = result;
    return body;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cerrar sesión',
    description:
      'Revoca el refresh token de la cookie httpOnly e invalida la sesión.',
  })
  @ApiResponse({ status: 200, description: 'Sesión cerrada correctamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await this.auth.logout(refreshToken);
    }
    res.clearCookie('refreshToken', { httpOnly: true, path: '/' });
    return { message: 'Logged out' };
  }

  @Post('mfa/setup')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Configurar MFA',
    description:
      'Genera un secreto TOTP y retorna un código QR para configurar la app de autenticación (Google Authenticator, Authy, etc.).',
  })
  @ApiResponse({
    status: 201,
    description: 'Retorna secret (base32) y qrCode (data URL)',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  setupMfa(@CurrentUser() user: { id: number }) {
    return this.auth.setupMfa(user.id);
  }

  @Public()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar código MFA',
    description:
      'Valida el código TOTP de 6 dígitos y completa el flujo de login con MFA. Retorna los tokens definitivos.',
  })
  @ApiResponse({
    status: 200,
    description:
      'MFA verificado — retorna accessToken (refreshToken en cookie httpOnly)',
  })
  @ApiResponse({
    status: 401,
    description: 'Código TOTP inválido o token temporal expirado',
  })
  async verifyMfa(
    @Body() dto: VerifyMfaDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verifyMfa(dto.tempToken, dto.token);
    res.cookie('refreshToken', result.refreshToken, this.cookieOptions);
    const { refreshToken: _, ...body } = result;
    return body;
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Desactivar MFA',
    description:
      'Elimina el secreto TOTP y desactiva la autenticación de dos factores para el usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'MFA desactivado correctamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  disableMfa(@CurrentUser() user: { id: number }) {
    return this.auth.disableMfa(user.id);
  }
}
