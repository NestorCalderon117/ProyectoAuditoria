import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service.js';
import { CreateIncidentDto, UpdateIncidentDto } from './dto/incidents.dto.js';
import { Roles, CurrentUser } from '../common/decorators/index.js';
import { Role } from '../../generated/prisma/client.js';

@ApiTags('Incidents — Incidentes de Seguridad')
@ApiBearerAuth()
@Controller('incidents')
export class IncidentsController {
  constructor(private incidents: IncidentsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar incidente', description: 'Crea un nuevo incidente de seguridad. Clasificaciones: Breach, NearMiss, SecurityEvent, PolicyViolation. HIPAA Breach Notification Rule.' })
  @ApiResponse({ status: 201, description: 'Incidente registrado con datos del reportante' })
  create(
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.incidents.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar incidentes', description: 'Retorna todos los incidentes de seguridad ordenados por fecha de creación descendente.' })
  @ApiResponse({ status: 200, description: 'Lista de incidentes con usuario que reportó' })
  findAll() {
    return this.incidents.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener incidente por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del incidente' })
  @ApiResponse({ status: 200, description: 'Datos del incidente' })
  @ApiResponse({ status: 404, description: 'Incidente no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.incidents.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.AUDITOR)
  @ApiOperation({ summary: 'Actualizar incidente', description: 'Modifica estado, descripción o cantidad de registros afectados. Cuando el estado cambia a Resolved o Closed se registra la fecha de resolución automáticamente. Solo ADMIN y AUDITOR.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del incidente a modificar' })
  @ApiResponse({ status: 200, description: 'Incidente actualizado' })
  @ApiResponse({ status: 404, description: 'Incidente no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.incidents.update(id, dto);
  }
}
