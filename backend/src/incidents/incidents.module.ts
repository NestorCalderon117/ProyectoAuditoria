import { Module } from '@nestjs/common';
import { IncidentsService } from './incidents.service.js';
import { IncidentsController } from './incidents.controller.js';

@Module({
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
