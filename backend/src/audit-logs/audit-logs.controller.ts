import { Controller, Get, Query, Res, Header } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuditLogsService } from './audit-logs.service.js';
import { QueryAuditLogsDto } from './dto/audit-logs.dto.js';
import { Roles } from '../common/decorators/index.js';
import { Role } from '../../generated/prisma/client.js';

@ApiTags('Audit Logs — Registro de Auditoría (HIPAA §164.312(b))')
@ApiBearerAuth()
@Controller('audit-logs')
@Roles(Role.ADMIN, Role.AUDITOR)
export class AuditLogsController {
  constructor(private auditLogs: AuditLogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Consultar logs de auditoría',
    description:
      'Retorna logs paginados con filtros opcionales por usuario, acción, recurso, rango de fechas e IP. Tabla append-only sin operaciones DELETE. Solo ADMIN y AUDITOR.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Logs paginados con metadatos {data, total, page, limit, totalPages}',
  })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  findAll(@Query() query: QueryAuditLogsDto) {
    return this.auditLogs.findAll(query);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Exportar logs a JSON',
    description:
      'Retorna hasta 10,000 registros de auditoría en formato JSON para exportación y evidencias de auditoría.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array de logs de auditoría para exportación',
  })
  exportJson(@Query() query: QueryAuditLogsDto) {
    return this.auditLogs.exportJson(query);
  }

  @Get('export/csv')
  @ApiOperation({
    summary: 'Exportar logs a CSV',
    description:
      'Retorna hasta 10,000 registros de auditoría en formato CSV para evidencias de auditoría HIPAA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo CSV con registros de auditoría',
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(@Query() query: QueryAuditLogsDto, @Res() res: Response) {
    const csv = await this.auditLogs.exportCsv(query);
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.send(csv);
  }
}
