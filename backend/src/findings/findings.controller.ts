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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FindingsService } from './findings.service.js';
import { CreateFindingDto, UpdateFindingDto } from './dto/findings.dto.js';
import { Roles } from '../common/decorators/index.js';
import { Role } from '../../generated/prisma/client.js';

@ApiTags('Findings — Hallazgos de Auditoría')
@ApiBearerAuth()
@Controller('findings')
@Roles(Role.ADMIN, Role.AUDITOR)
export class FindingsController {
  constructor(private findings: FindingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear hallazgo',
    description:
      'Registra un nuevo hallazgo de auditoría vinculado a un control HIPAA. Solo ADMIN y AUDITOR.',
  })
  @ApiResponse({ status: 201, description: 'Hallazgo creado' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  create(@Body() dto: CreateFindingDto) {
    return this.findings.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar hallazgos',
    description:
      'Retorna todos los hallazgos de auditoría ordenados por fecha de creación descendente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de hallazgos con usuario asignado',
  })
  findAll() {
    return this.findings.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener hallazgo por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del hallazgo' })
  @ApiResponse({ status: 200, description: 'Datos del hallazgo' })
  @ApiResponse({ status: 404, description: 'Hallazgo no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.findings.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar hallazgo',
    description:
      'Modifica estado, severidad, descripción, responsable o fecha límite. Cuando el estado cambia a Closed o Remediated se registra la fecha de cierre automáticamente.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del hallazgo a modificar',
  })
  @ApiResponse({ status: 200, description: 'Hallazgo actualizado' })
  @ApiResponse({ status: 404, description: 'Hallazgo no encontrado' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFindingDto) {
    return this.findings.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar hallazgo' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del hallazgo a eliminar',
  })
  @ApiResponse({ status: 200, description: 'Hallazgo eliminado' })
  @ApiResponse({ status: 404, description: 'Hallazgo no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.findings.remove(id);
  }
}
