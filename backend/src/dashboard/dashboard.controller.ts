import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Dashboard — Métricas y Cumplimiento')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener resumen del dashboard', description: 'Retorna métricas agregadas: porcentaje de cumplimiento HIPAA, hallazgos abiertos por severidad, incidentes recientes (últimos 90 días), top 5 usuarios más activos y actividad por hora del día (últimos 7 días).' })
  @ApiResponse({ status: 200, description: 'Objeto con {compliance, findingsBySeverity, recentIncidents, topUsers, activityByHour}' })
  getOverview() {
    return this.dashboard.getOverview();
  }
}
