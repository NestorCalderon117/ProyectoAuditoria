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
import { HipaaControlsService } from './hipaa-controls.service.js';
import {
  CreateHipaaControlDto,
  UpdateHipaaControlDto,
} from './dto/hipaa-controls.dto.js';
import { Roles, CurrentUser } from '../common/decorators/index.js';
import { Role } from '../../generated/prisma/client.js';

@ApiTags('HIPAA Controls — Checklist de Cumplimiento')
@ApiBearerAuth()
@Controller('hipaa-controls')
export class HipaaControlsController {
  constructor(private hipaaControls: HipaaControlsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.AUDITOR)
  @ApiOperation({ summary: 'Crear control HIPAA', description: 'Registra un nuevo control del HIPAA Security Rule en el catálogo. Solo ADMIN y AUDITOR.' })
  @ApiResponse({ status: 201, description: 'Control creado' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  create(@Body() dto: CreateHipaaControlDto) {
    return this.hipaaControls.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar controles HIPAA', description: 'Retorna todos los controles HIPAA ordenados por código, con información del último revisor.' })
  @ApiResponse({ status: 200, description: 'Lista de controles HIPAA' })
  findAll() {
    return this.hipaaControls.findAll();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen de cumplimiento', description: 'Calcula el porcentaje de cumplimiento global y por categoría de salvaguarda (Administrative, Technical, Physical). Los controles parcialmente implementados cuentan como 50%.' })
  @ApiResponse({ status: 200, description: 'Porcentaje global de cumplimiento, desglose por categoría {total, implemented, partial, percentage, byCategory}' })
  getComplianceSummary() {
    return this.hipaaControls.getComplianceSummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener control HIPAA por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del control HIPAA' })
  @ApiResponse({ status: 200, description: 'Datos del control' })
  @ApiResponse({ status: 404, description: 'Control no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.hipaaControls.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.AUDITOR)
  @ApiOperation({ summary: 'Actualizar control HIPAA', description: 'Modifica el estado de implementación, evidencia o descripción de un control. Registra automáticamente la fecha de revisión y el revisor. Solo ADMIN y AUDITOR.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del control a modificar' })
  @ApiResponse({ status: 200, description: 'Control actualizado con fecha de revisión' })
  @ApiResponse({ status: 404, description: 'Control no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHipaaControlDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.hipaaControls.update(id, dto, user.id);
  }
}
