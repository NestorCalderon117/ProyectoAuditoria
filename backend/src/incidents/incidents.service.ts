import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateIncidentDto, UpdateIncidentDto } from './dto/incidents.dto.js';
import { IncidentStatus } from '../../generated/prisma/client.js';

@Injectable()
export class IncidentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateIncidentDto, userId: number) {
    return this.prisma.securityIncident.create({
      data: {
        type: dto.type,
        description: dto.description,
        affectedCount: dto.affectedCount ?? 0,
        reportedById: userId,
      },
      include: { reportedBy: { select: { id: true, email: true } } },
    });
  }

  async findAll() {
    return this.prisma.securityIncident.findMany({
      include: { reportedBy: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const incident = await this.prisma.securityIncident.findUnique({
      where: { id },
      include: { reportedBy: { select: { id: true, email: true } } },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async update(id: number, dto: UpdateIncidentDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = { ...dto };
    if (
      dto.status === IncidentStatus.Resolved ||
      dto.status === IncidentStatus.Closed
    ) {
      data.resolvedAt = new Date();
    }

    return this.prisma.securityIncident.update({
      where: { id },
      data,
      include: { reportedBy: { select: { id: true, email: true } } },
    });
  }
}
