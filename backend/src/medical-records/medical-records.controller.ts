import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service.js';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
} from './dto/medical-records.dto.js';
import { Roles, CurrentUser } from '../common/decorators/index.js';
import { Role } from '../../generated/prisma/client.js';

@ApiTags('Medical Records — Registros Médicos (PHI)')
@ApiBearerAuth()
@Controller('medical-records')
@Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE)
export class MedicalRecordsController {
  constructor(private medicalRecords: MedicalRecordsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Crear registro médico', description: 'Crea un nuevo registro médico asociado a un paciente. El contenido se cifra con AES-256-CBC. Solo ADMIN y DOCTOR.' })
  @ApiResponse({ status: 201, description: 'Registro creado exitosamente' })
  create(
    @Body() dto: CreateMedicalRecordDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.medicalRecords.create(dto, user.id);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Listar registros por paciente', description: 'Retorna todos los registros médicos de un paciente con contenido descifrado.' })
  @ApiParam({ name: 'patientId', type: Number, description: 'ID del paciente' })
  @ApiResponse({ status: 200, description: 'Lista de registros médicos' })
  findByPatient(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.medicalRecords.findByPatient(patientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener registro médico por ID', description: 'Retorna un registro médico individual con contenido descifrado.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del registro médico' })
  @ApiResponse({ status: 200, description: 'Registro médico con contenido descifrado' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.medicalRecords.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Actualizar registro médico', description: 'Modifica un registro médico existente. El contenido se recifra automáticamente. Solo ADMIN y DOCTOR.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del registro a modificar' })
  @ApiResponse({ status: 200, description: 'Registro actualizado' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMedicalRecordDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.medicalRecords.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar registro médico', description: 'Elimina un registro médico. Solo ADMIN.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del registro a eliminar' })
  @ApiResponse({ status: 200, description: 'Registro eliminado' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.medicalRecords.remove(id);
  }
}
