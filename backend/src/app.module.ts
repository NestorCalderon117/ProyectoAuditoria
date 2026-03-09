import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
import { FindingsModule } from './findings/findings.module.js';
import { HipaaControlsModule } from './hipaa-controls/hipaa-controls.module.js';
import { IncidentsModule } from './incidents/incidents.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { MedicalRecordsModule } from './medical-records/medical-records.module.js';
import { JwtAuthGuard, RolesGuard } from './common/guards/index.js';
import { AuditInterceptor } from './common/interceptors/audit.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    AuditLogsModule,
    FindingsModule,
    HipaaControlsModule,
    IncidentsModule,
    DashboardModule,
    MedicalRecordsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guards globales — JWT primero, luego Roles
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Interceptor global — registro de auditoría automático
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
