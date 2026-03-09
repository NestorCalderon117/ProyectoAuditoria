import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/client.js';

export class CreateUserDto {
  @ApiProperty({ example: 'doctor@healthtech.com', description: 'Correo electrónico único del usuario' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3cur3P@ss!', minLength: 8, description: 'Contraseña (mínimo 8 caracteres)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: ['ADMIN', 'DOCTOR', 'NURSE', 'AUDITOR', 'LAB_EXTERNAL', 'PHARMACIST'], example: 'DOCTOR', description: 'Rol del usuario en el sistema' })
  @IsEnum(Role)
  role: Role;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'nuevo@healthtech.com', description: 'Nuevo correo electrónico' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ enum: ['ADMIN', 'DOCTOR', 'NURSE', 'AUDITOR', 'LAB_EXTERNAL', 'PHARMACIST'], description: 'Nuevo rol' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ example: true, description: 'Activar o desactivar la cuenta' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual del usuario' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ minLength: 8, description: 'Nueva contraseña (no puede ser una de las últimas 5 usadas)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
