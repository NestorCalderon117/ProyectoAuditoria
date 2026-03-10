import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EncryptionService } from '../common/services/encryption.service.js';
import { CreatePatientDto, UpdatePatientDto } from './dto/patients.dto.js';

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  async create(dto: CreatePatientDto, userId: number) {
    return this.prisma.patient.create({
      data: {
        mrn: dto.mrn,
        nameEnc: this.encryption.encrypt(dto.name),
        dobEnc: this.encryption.encrypt(dto.dob),
        ssnEnc: this.encryption.encrypt(dto.ssn),
        diagnosisEnc: dto.diagnosis
          ? this.encryption.encrypt(dto.diagnosis)
          : null,
        createdById: userId,
      },
    });
  }

  async findAll() {
    const patients = await this.prisma.patient.findMany({
      where: { isDeleted: false },
    });
    return patients.map((p) => this.decryptPatient(p));
  }

  async findOne(id: number) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, isDeleted: false },
      include: { medicalRecords: true },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    return this.decryptPatient(patient);
  }

  async update(id: number, dto: UpdatePatientDto) {
    await this.findOne(id);

    const data: Record<string, string | null> = {};
    if (dto.name) data.nameEnc = this.encryption.encrypt(dto.name);
    if (dto.dob) data.dobEnc = this.encryption.encrypt(dto.dob);
    if (dto.ssn) data.ssnEnc = this.encryption.encrypt(dto.ssn);
    if (dto.diagnosis)
      data.diagnosisEnc = this.encryption.encrypt(dto.diagnosis);

    const updated = await this.prisma.patient.update({
      where: { id },
      data,
    });
    return this.decryptPatient(updated);
  }

  async softDelete(id: number) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  private decryptPatient<
    T extends {
      nameEnc: string;
      dobEnc: string;
      ssnEnc: string;
      diagnosisEnc?: string | null;
    },
  >(patient: T) {
    const { nameEnc, dobEnc, ssnEnc, diagnosisEnc, ...rest } = patient;
    return {
      ...rest,
      name: this.encryption.decrypt(nameEnc),
      dob: this.encryption.decrypt(dobEnc),
      ssn: this.encryption.decrypt(ssnEnc),
      diagnosis: diagnosisEnc ? this.encryption.decrypt(diagnosisEnc) : null,
    };
  }
}
