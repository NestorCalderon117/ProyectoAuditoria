import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiProperty({
    example: 'MRN-00001',
    description: 'Número de registro médico único (Medical Record Number)',
  })
  @IsString()
  @IsNotEmpty()
  mrn: string;

  @ApiProperty({
    example: 'Juan Carlos Pérez López',
    description: 'Nombre completo del paciente (se cifra con AES-256 en BD)',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '1990-05-15',
    description: 'Fecha de nacimiento (se cifra con AES-256 en BD)',
  })
  @IsString()
  @IsNotEmpty()
  dob: string;

  @ApiProperty({
    example: '123-45-6789',
    description: 'Número de seguro social (se cifra con AES-256 en BD)',
  })
  @IsString()
  @IsNotEmpty()
  ssn: string;

  @ApiPropertyOptional({
    example: 'Hipertensión arterial grado II',
    description: 'Diagnóstico del paciente (se cifra con AES-256 en BD)',
  })
  @IsString()
  @IsOptional()
  diagnosis?: string;
}

export class UpdatePatientDto {
  @ApiPropertyOptional({
    example: 'Juan Carlos Pérez López',
    description: 'Nombre completo actualizado',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: '1990-05-15',
    description: 'Fecha de nacimiento actualizada',
  })
  @IsString()
  @IsOptional()
  dob?: string;

  @ApiPropertyOptional({
    example: '123-45-6789',
    description: 'Número de seguro social actualizado',
  })
  @IsString()
  @IsOptional()
  ssn?: string;

  @ApiPropertyOptional({
    example: 'Hipertensión arterial grado II',
    description: 'Diagnóstico actualizado',
  })
  @IsString()
  @IsOptional()
  diagnosis?: string;
}
