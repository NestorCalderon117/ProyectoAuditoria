import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { QueryAuditLogsDto } from './dto/audit-logs.dto.js';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryAuditLogsDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = Math.min(parseInt(query.limit ?? '50', 10), 200);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.userId) where.userId = parseInt(query.userId, 10);
    if (query.action) where.action = query.action;
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.ipAddress) where.ipAddress = query.ipAddress;

    if (query.from || query.to) {
      where.timestamp = {};
      if (query.from) where.timestamp.gte = new Date(query.from);
      if (query.to) where.timestamp.lte = new Date(query.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, email: true, role: true } } },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async exportJson(query: QueryAuditLogsDto) {
    const result = await this.findAll({ ...query, limit: '10000' });
    return result.data;
  }

  async exportCsv(query: QueryAuditLogsDto): Promise<string> {
    const data = await this.exportJson(query);
    const headers = [
      'id',
      'userId',
      'action',
      'resourceType',
      'resourceId',
      'ipAddress',
      'userAgent',
      'httpMethod',
      'endpoint',
      'statusCode',
      'timestamp',
    ];
    const rows = data.map((row: Record<string, unknown>) =>
      headers
        .map((h) => {
          const val = row[h];
          const str =
            val instanceof Date ? val.toISOString() : String(val ?? '');
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }
}
