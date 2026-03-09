import { Module } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service.js';
import { MedicalRecordsController } from './medical-records.controller.js';
import { EncryptionService } from '../common/services/encryption.service.js';

@Module({
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService, EncryptionService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
