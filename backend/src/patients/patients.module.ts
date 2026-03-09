import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service.js';
import { PatientsController } from './patients.controller.js';
import { EncryptionService } from '../common/services/encryption.service.js';

@Module({
  controllers: [PatientsController],
  providers: [PatientsService, EncryptionService],
  exports: [PatientsService],
})
export class PatientsModule {}
