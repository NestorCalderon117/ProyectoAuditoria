import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EncryptionService } from '../common/services/encryption.service.js';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
} from './dto/medical-records.dto.js';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
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
    await this.findOne(id);
    return this.prisma.medicalRecord.delete({ where: { id } });
  }

  private decryptRecord<T extends { contentEnc: string }>(record: T) {
    const { contentEnc, ...rest } = record;
    return { ...rest, content: this.encryption.decrypt(contentEnc) };
  }
}
