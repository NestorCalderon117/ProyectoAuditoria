import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@healthtech.com', description: 'Correo electrónico del usuario' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssw0rd!2026', description: 'Contraseña del usuario' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token JWT obtenido en el login' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class VerifyMfaDto {
  @ApiProperty({ example: '123456', description: 'Código TOTP de 6 dígitos generado por la app de autenticación' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Token temporal recibido en el login cuando MFA está habilitado' })
  @IsString()
  @IsNotEmpty()
  tempToken: string;
}
