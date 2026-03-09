import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentType, IncidentStatus } from '../../../generated/prisma/client.js';

export class CreateIncidentDto {
  @ApiProperty({ enum: ['Breach', 'NearMiss', 'SecurityEvent', 'PolicyViolation'], example: 'Breach', description: 'Clasificación del incidente de seguridad' })
  @IsEnum(IncidentType)
  type: IncidentType;

  @ApiProperty({ example: 'Acceso no autorizado a registros PHI desde IP externa', description: 'Descripción detallada del incidente' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 150, default: 0, description: 'Cantidad de registros PHI potencialmente afectados' })
  @IsOptional()
  @IsInt()
  affectedCount?: number;
}

export class UpdateIncidentDto {
  @ApiPropertyOptional({ enum: ['Open', 'Investigating', 'Resolved', 'Closed'], description: 'Nuevo estado del incidente' })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({ description: 'Descripción actualizada del incidente' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 200, description: 'Cantidad actualizada de registros afectados' })
  @IsOptional()
  @IsInt()
  affectedCount?: number;
}
