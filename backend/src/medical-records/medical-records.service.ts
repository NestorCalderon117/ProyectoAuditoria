import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EncryptionService } from '../common/services/encryption.service.js';
import { BlobStorageService } from '../common/services/blob-storage.service.js';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
} from './dto/medical-records.dto.js';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private blobStorage: BlobStorageService,
  ) {}

  async create(dto: CreateMedicalRecordDto, userId: number) {
    // Verify patient exists and is active
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, isDeleted: false },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    return this.prisma.medicalRecord.create({
      data: {
        patientId: dto.patientId,
        recordType: dto.recordType,
        contentEnc: this.encryption.encrypt(dto.content),
        s3ImageKey: dto.s3ImageKey ?? null,
        accessedById: userId,
      },
    });
  }

  async findByPatient(patientId: number) {
    const records = await this.prisma.medicalRecord.findMany({
      where: { patientId },
      include: { accessedBy: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.decryptRecord(r));
  }

  async findOne(id: number) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, mrn: true } },
        accessedBy: { select: { id: true, email: true } },
      },
    });
    if (!record) throw new NotFoundException('Registro médico no encontrado');
    return this.decryptRecord(record);
  }

  async update(id: number, dto: UpdateMedicalRecordDto, userId: number) {
    await this.findOne(id);

    const data: Record<string, unknown> = { accessedById: userId };
    if (dto.recordType) data.recordType = dto.recordType;
    if (dto.content) data.contentEnc = this.encryption.encrypt(dto.content);
    if (dto.s3ImageKey) data.s3ImageKey = dto.s3ImageKey;

    const updated = await this.prisma.medicalRecord.update({
      where: { id },
      data,
    });
    return this.decryptRecord(updated);
  }

  async remove(id: number) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('Registro medico no encontrado');

    if (record.s3ImageKey) {
      await this.blobStorage.deleteBlobIfExists(record.s3ImageKey);
    }

    return this.prisma.medicalRecord.delete({ where: { id } });
  }

  async uploadImage(id: number, userId: number, file: Express.Multer.File) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: { patient: { select: { mrn: true } } },
    });

    if (!record) throw new NotFoundException('Registro medico no encontrado');
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('Archivo no enviado o vacio.');
    }

    const allowedMimeTypes = new Set([
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/dicom',
      'application/octet-stream',
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido.');
    }

    const safeOriginalName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-120);
    const key = `${record.patient.mrn}/record-${record.id}/${Date.now()}-${safeOriginalName}`;

    try {
      await this.blobStorage.uploadBuffer(key, file.buffer, file.mimetype);

      if (record.s3ImageKey && record.s3ImageKey !== key) {
        await this.blobStorage.deleteBlobIfExists(record.s3ImageKey);
      }

      const updated = await this.prisma.medicalRecord.update({
        where: { id },
        data: { s3ImageKey: key, accessedById: userId },
      });

      return this.decryptRecord(updated);
    } catch {
      throw new InternalServerErrorException(
        'Error subiendo imagen a Azure Blob.',
      );
    }
  }

  async getImageSasUrl(id: number) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('Registro medico no encontrado');
    if (!record.s3ImageKey) {
      throw new NotFoundException('El registro no tiene imagen asociada.');
    }

    const sas = this.blobStorage.getReadSasUrl(record.s3ImageKey);
    return { ...sas, key: record.s3ImageKey };
  }

  async removeImage(id: number, userId: number) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('Registro medico no encontrado');
    if (!record.s3ImageKey) {
      return { ok: true, message: 'El registro no tenia imagen asociada.' };
    }

    await this.blobStorage.deleteBlobIfExists(record.s3ImageKey);
    await this.prisma.medicalRecord.update({
      where: { id },
      data: { s3ImageKey: null, accessedById: userId },
    });

    return { ok: true };
  }

  private decryptRecord<T extends { contentEnc: string }>(record: T) {
    const { contentEnc, ...rest } = record;
    return { ...rest, content: this.encryption.decrypt(contentEnc) };
  }
}
