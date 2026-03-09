import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '../../../generated/prisma/client.js';

export class QueryAuditLogsDto {
  @ApiPropertyOptional({ example: '1', description: 'Filtrar por ID de usuario' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: ['CREATE', 'READ', 'UPDATE', 'DELETE'], description: 'Filtrar por tipo de acción' })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ example: 'patients', description: 'Filtrar por tipo de recurso (patients, users, findings, etc.)' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Fecha de inicio del rango (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Fecha de fin del rango (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: '192.168.1.100', description: 'Filtrar por dirección IP de origen' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ example: '1', default: '1', description: 'Número de página' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '50', default: '50', description: 'Registros por página (máximo 200)' })
  @IsOptional()
  @IsString()
  limit?: string;
}
