import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly maxAttempts: number;
  private readonly lockMinutes = 30;
  private readonly pwdMaxAgeDays: number;
  private readonly sessionTimeoutMin: number;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.maxAttempts = this.config.get<number>('MAX_FAILED_ATTEMPTS', 5);
    this.pwdMaxAgeDays = this.config.get<number>(
      'PASSWORD_EXPIRY_DAYS',
      this.config.get<number>('PWD_MAX_AGE_DAYS', 90),
    );
    this.sessionTimeoutMin = this.config.get<number>(
      'SESSION_TIMEOUT_MINUTES',
      this.config.get<number>('SESSION_TIMEOUT_MIN', 15),
    );
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        'Cuenta bloqueada. Intente de nuevo más tarde.',
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const attempts = user.failedAttempts + 1;
      const update: Record<string, unknown> = { failedAttempts: attempts };
      if (attempts >= this.maxAttempts) {
        update.lockedUntil = new Date(Date.now() + this.lockMinutes * 60_000);
      }
      await this.prisma.user.update({ where: { id: user.id }, data: update });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Reiniciar contador de intentos fallidos y actualizar último login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLogin: new Date() },
    });

    // revisar si la contraseña ha expirado o está próxima a expirar
    const pwdAge = Date.now() - user.pwdChangedAt.getTime();
    const maxAge = this.pwdMaxAgeDays * 86_400_000;
    const passwordExpired = pwdAge > maxAge;

    // Si MFA está habilitado o el usuario tiene un secreto MFA configurado pero no activo, requerir verificación TOTP antes de emitir tokens
    if (user.mfaEnabled || user.mfaSecret) {
      const tempToken = this.jwt.sign(
        { sub: user.id, mfaPending: true },
        { expiresIn: '5m' },
      );
      return { mfaRequired: true, tempToken, passwordExpired };
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { ...tokens, passwordExpired };
  }

  async setupMfa(userId: number) {
    const secret = speakeasy.generateSecret({
      name: `HealthTech (${userId})`,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 },
    });

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url!);
    return { secret: secret.base32, qrCode: qrDataUrl };
  }

  async verifyMfa(tempToken: string, token: string) {
    let payload: { sub: number; mfaPending?: boolean };
    try {
      payload = this.jwt.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Sesión MFA inválida o expirada');
    }
    if (!payload.mfaPending) {
      throw new UnauthorizedException('Token MFA inválido');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
    });
    if (!user.mfaSecret) throw new UnauthorizedException('MFA no configurado');

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });
    if (!verified) {
      this.logger.warn(`MFA fallido para el usuario ${user.id} — token="${token}", time=${Date.now()}`);
      throw new UnauthorizedException('Código TOTP inválido');
    }

    // Habilitar MFA si el usuario solo tenía el secreto pero no estaba activo (caso de setup reciente)
    if (!user.mfaEnabled) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { mfaEnabled: true },
      });
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async disableMfa(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: null, mfaEnabled: false },
    });
    return { message: 'MFA deshabilitado' };
  }

  async refresh(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash, revoked: false },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    // Si el token ha estado inactivo por más del tiempo permitido, revocarlo y requerir login completo
    const inactiveMs = Date.now() - stored.lastActivityAt.getTime();
    if (inactiveMs > this.sessionTimeoutMin * 60_000) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Sesión expirada por inactividad');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    return this.issueTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role,
    );
  }

  async logout(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash },
      data: { revoked: true },
    });
  }

  private async issueTokens(userId: number, email: string, role: string) {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = this.jwt.sign(payload);

    const refreshExpiresIn =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: refreshExpiresIn as any,
    });

    const days = parseInt(refreshExpiresIn) || 7;
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + days * 86_400_000),
        lastActivityAt: new Date(),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
