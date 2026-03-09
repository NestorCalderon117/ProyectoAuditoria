import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FindingCategory,
  FindingSeverity,
  FindingStatus,
} from '../../../generated/prisma/client.js';

export class CreateFindingDto {
  @ApiProperty({ enum: ['Administrative', 'Technical', 'Physical'], example: 'Technical', description: 'Categoría de salvaguarda HIPAA' })
  @IsEnum(FindingCategory)
  category: FindingCategory;

  @ApiProperty({ enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'], example: 'High', description: 'Nivel de severidad del hallazgo' })
  @IsEnum(FindingSeverity)
  severity: FindingSeverity;

  @ApiProperty({ example: '§164.312(a)(1)', description: 'Código del control HIPAA afectado' })
  @IsString()
  @IsNotEmpty()
  hipaaControlCode: string;

  @ApiProperty({ example: 'No se implementa cifrado en tránsito para datos PHI', description: 'Descripción detallada del hallazgo' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 1, description: 'ID del usuario responsable de la remediación' })
  @IsOptional()
  @IsInt()
  assignedToId?: number;

  @ApiPropertyOptional({ example: '2026-06-30', description: 'Fecha límite de remediación (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateFindingDto {
  @ApiPropertyOptional({ enum: ['Open', 'InProgress', 'Remediated', 'AcceptedRisk', 'Closed'], description: 'Nuevo estado del hallazgo' })
  @IsOptional()
  @IsEnum(FindingStatus)
  status?: FindingStatus;

  @ApiPropertyOptional({ enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'], description: 'Nuevo nivel de severidad' })
  @IsOptional()
  @IsEnum(FindingSeverity)
  severity?: FindingSeverity;

  @ApiPropertyOptional({ description: 'Descripción actualizada del hallazgo' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 2, description: 'Nuevo ID del usuario responsable' })
  @IsOptional()
  @IsInt()
  assignedToId?: number;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Nueva fecha límite de remediación' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
