import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMedicalRecordDto {
  @ApiProperty({ example: 1, description: 'ID del paciente asociado' })
  @IsInt()
  patientId: number;

  @ApiProperty({
    example: 'XRAY',
    description: 'Tipo de registro médico (XRAY, CT, MRI, LAB, GENERAL)',
  })
  @IsString()
  @IsNotEmpty()
  recordType: string;

  @ApiProperty({
    example: 'Hallazgos de radiografía torácica...',
    description: 'Contenido del registro (se cifra con AES-256 en BD)',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    example: 'MRN-00001/rec-001/img.dcm',
    description: 'Blob Key en Azure Storage para imagen medica',
  })
  @IsString()
  @IsOptional()
  s3ImageKey?: string;
}

export class UpdateMedicalRecordDto {
  @ApiPropertyOptional({
    example: 'XRAY',
    description: 'Tipo de registro actualizado',
  })
  @IsString()
  @IsOptional()
  recordType?: string;

  @ApiPropertyOptional({
    example: 'Hallazgos actualizados...',
    description: 'Contenido actualizado (se recifra automáticamente)',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    example: 'MRN-00001/rec-001/img.dcm',
    description: 'Blob Key actualizado',
  })
  @IsString()
  @IsOptional()
  s3ImageKey?: string;
}
