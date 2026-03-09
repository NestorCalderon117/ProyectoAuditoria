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
import { PatientsService } from './patients.service.js';
import { CreatePatientDto, UpdatePatientDto } from './dto/patients.dto.js';
import { Roles, CurrentUser } from '../common/decorators/index.js';
import { Role } from '../../generated/prisma/client.js';

@ApiTags('Patients — Registros Médicos (PHI)')
@ApiBearerAuth()
@Controller('patients')
@Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE)
export class PatientsController {
  constructor(private patients: PatientsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Crear paciente', description: 'Registra un nuevo paciente. Los campos nombre, fecha de nacimiento y SSN se cifran con AES-256-CBC antes de almacenarse. Solo ADMIN y DOCTOR.' })
  @ApiResponse({ status: 201, description: 'Paciente creado exitosamente' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  create(
    @Body() dto: CreatePatientDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.patients.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pacientes', description: 'Retorna todos los pacientes activos con datos PHI descifrados. Acceso: ADMIN, DOCTOR, NURSE.' })
  @ApiResponse({ status: 200, description: 'Lista de pacientes con datos descifrados' })
  findAll() {
    return this.patients.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener paciente por ID', description: 'Retorna los datos del paciente con registros médicos asociados. Datos PHI descifrados.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del paciente' })
  @ApiResponse({ status: 200, description: 'Datos del paciente con registros médicos' })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.patients.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Actualizar paciente', description: 'Modifica datos PHI del paciente (se recifran automáticamente). Solo ADMIN y DOCTOR.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del paciente a modificar' })
  @ApiResponse({ status: 200, description: 'Paciente actualizado' })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patients.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar paciente (soft delete)', description: 'Marca al paciente como eliminado sin borrar físicamente el registro (retención regulatoria). Solo ADMIN.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del paciente a eliminar' })
  @ApiResponse({ status: 200, description: 'Paciente marcado como eliminado' })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.patients.softDelete(id);
  }
}
