import { Module } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service.js';
import { MedicalRecordsController } from './medical-records.controller.js';
import { EncryptionService } from '../common/services/encryption.service.js';
import { BlobStorageService } from '../common/services/blob-storage.service.js';

@Module({
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService, EncryptionService, BlobStorageService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
