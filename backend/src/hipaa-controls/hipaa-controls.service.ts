import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateHipaaControlDto,
  UpdateHipaaControlDto,
} from './dto/hipaa-controls.dto.js';
import { HipaaControlStatus, SafeguardType } from '../../generated/prisma/client.js';

@Injectable()
export class HipaaControlsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateHipaaControlDto) {
    return this.prisma.hipaaControl.create({ data: dto });
  }

  async findAll() {
    return this.prisma.hipaaControl.findMany({
      include: { reviewedBy: { select: { id: true, email: true } } },
      orderBy: { controlCode: 'asc' },
    });
  }

  async findOne(id: number) {
    const control = await this.prisma.hipaaControl.findUnique({
      where: { id },
      include: { reviewedBy: { select: { id: true, email: true } } },
    });
    if (!control) throw new NotFoundException('HIPAA control not found');
    return control;
  }

  async update(id: number, dto: UpdateHipaaControlDto, reviewedById: number) {
    await this.findOne(id);
    return this.prisma.hipaaControl.update({
      where: { id },
      data: {
        ...dto,
        reviewedById,
        lastReviewedAt: new Date(),
      },
      include: { reviewedBy: { select: { id: true, email: true } } },
    });
  }

  async getComplianceSummary() {
    const controls = await this.prisma.hipaaControl.findMany();
    const total = controls.length;
    if (total === 0) return { total: 0, percentage: 0, byCategory: {} };

    const implemented = controls.filter(
      (c) => c.status === HipaaControlStatus.Implemented,
    ).length;
    const partial = controls.filter(
      (c) => c.status === HipaaControlStatus.PartiallyImplemented,
    ).length;

    const percentage = Math.round(
      ((implemented + partial * 0.5) / total) * 100,
    );

    const byCategory: Record<string, { total: number; implemented: number; percentage: number }> = {};
    for (const type of Object.values(SafeguardType)) {
      const catControls = controls.filter((c) => c.safeguardType === type);
      const catTotal = catControls.length;
      const catImpl = catControls.filter(
        (c) => c.status === HipaaControlStatus.Implemented,
      ).length;
      const catPartial = catControls.filter(
        (c) => c.status === HipaaControlStatus.PartiallyImplemented,
      ).length;
      byCategory[type] = {
        total: catTotal,
        implemented: catImpl,
        percentage: catTotal
          ? Math.round(((catImpl + catPartial * 0.5) / catTotal) * 100)
          : 0,
      };
    }

    return { total, implemented, partial, percentage, byCategory };
  }
}
