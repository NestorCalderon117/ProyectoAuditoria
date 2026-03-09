import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFindingDto, UpdateFindingDto } from './dto/findings.dto.js';
import { FindingStatus } from '../../generated/prisma/client.js';

@Injectable()
export class FindingsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFindingDto) {
    return this.prisma.auditFinding.create({
      data: {
        category: dto.category,
        severity: dto.severity,
        hipaaControlCode: dto.hipaaControlCode,
        description: dto.description,
        assignedToId: dto.assignedToId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: { assignedTo: { select: { id: true, email: true } } },
    });
  }

  async findAll() {
    return this.prisma.auditFinding.findMany({
      include: { assignedTo: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const finding = await this.prisma.auditFinding.findUnique({
      where: { id },
      include: { assignedTo: { select: { id: true, email: true } } },
    });
    if (!finding) throw new NotFoundException('Finding not found');
    return finding;
  }

  async update(id: number, dto: UpdateFindingDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = { ...dto };
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    if (dto.status === FindingStatus.Closed || dto.status === FindingStatus.Remediated) {
      data.closedAt = new Date();
    }

    return this.prisma.auditFinding.update({
      where: { id },
      data,
      include: { assignedTo: { select: { id: true, email: true } } },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.auditFinding.delete({ where: { id } });
  }
}
