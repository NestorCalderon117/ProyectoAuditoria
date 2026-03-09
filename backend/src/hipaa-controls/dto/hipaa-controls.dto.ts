import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HipaaControlStatus, SafeguardType } from '../../../generated/prisma/client.js';

export class CreateHipaaControlDto {
  @ApiProperty({ enum: ['Administrative', 'Technical', 'Physical'], example: 'Technical', description: 'Tipo de salvaguarda HIPAA Security Rule' })
  @IsEnum(SafeguardType)
  safeguardType: SafeguardType;

  @ApiProperty({ example: '§164.312(a)(1)', description: 'Código único del control HIPAA' })
  @IsString()
  @IsNotEmpty()
  controlCode: string;

  @ApiProperty({ example: 'Access Control — Unique User Identification', description: 'Descripción del control de seguridad' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: ['Implemented', 'PartiallyImplemented', 'NotImplemented', 'NotApplicable'], default: 'NotImplemented', description: 'Estado de implementación del control' })
  @IsOptional()
  @IsEnum(HipaaControlStatus)
  status?: HipaaControlStatus;
}

export class UpdateHipaaControlDto {
  @ApiPropertyOptional({ enum: ['Implemented', 'PartiallyImplemented', 'NotImplemented', 'NotApplicable'], description: 'Nuevo estado de implementación' })
  @IsOptional()
  @IsEnum(HipaaControlStatus)
  status?: HipaaControlStatus;

  @ApiPropertyOptional({ example: 'Archivo de evidencia en S3: /evidences/control-312a1.pdf', description: 'Referencia a la evidencia que soporta el estado del control' })
  @IsOptional()
  @IsString()
  evidenceRef?: string;

  @ApiPropertyOptional({ description: 'Descripción actualizada del control' })
  @IsOptional()
  @IsString()
  description?: string;
}
