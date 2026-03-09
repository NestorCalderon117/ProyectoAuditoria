import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  FindingSeverity,
  FindingStatus,
  HipaaControlStatus,
  IncidentStatus,
} from '../../generated/prisma/client.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const [
      compliance,
      findingsBySeverity,
      recentIncidents,
      topUsers,
      activityByHour,
    ] = await Promise.all([
      this.getCompliancePercentage(),
      this.getFindingsBySeverity(),
      this.getRecentIncidents(),
      this.getTopActiveUsers(),
      this.getActivityByHour(),
    ]);

    return {
      compliance,
      findingsBySeverity,
      recentIncidents,
      topUsers,
      activityByHour,
    };
  }

  private async getCompliancePercentage() {
    const controls = await this.prisma.hipaaControl.findMany();
    const total = controls.length;
    if (total === 0) return { total: 0, percentage: 0 };

    const implemented = controls.filter(
      (c) => c.status === HipaaControlStatus.Implemented,
    ).length;
    const partial = controls.filter(
      (c) => c.status === HipaaControlStatus.PartiallyImplemented,
    ).length;

    return {
      total,
      implemented,
      partial,
      notImplemented: total - implemented - partial,
      percentage: Math.round(((implemented + partial * 0.5) / total) * 100),
    };
  }

  private async getFindingsBySeverity() {
    const openStatuses: FindingStatus[] = [
      FindingStatus.Open,
      FindingStatus.InProgress,
    ];

    const findings = await this.prisma.auditFinding.groupBy({
      by: ['severity'],
      where: { status: { in: openStatuses } },
      _count: true,
    });

    const result: Record<string, number> = {};
    for (const s of Object.values(FindingSeverity)) {
      result[s] = 0;
    }
    for (const f of findings) {
      result[f.severity] = f._count;
    }
    return result;
  }

  private async getRecentIncidents() {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    return this.prisma.securityIncident.findMany({
      where: { createdAt: { gte: since } },
      include: { reportedBy: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  private async getTopActiveUsers() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: { timestamp: { gte: thirtyDaysAgo }, userId: { not: null } },
      _count: true,
      orderBy: { _count: { userId: 'desc' } },
      take: 5,
    });

    const userIds = result
      .map((r) => r.userId)
      .filter((id): id is number => id !== null);

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, role: true },
    });

    return result.map((r) => ({
      user: users.find((u) => u.id === r.userId),
      actionCount: r._count,
    }));
  }

  private async getActivityByHour() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const logs = await this.prisma.auditLog.findMany({
      where: { timestamp: { gte: sevenDaysAgo } },
      select: { timestamp: true },
    });

    const hourCounts = new Array<number>(24).fill(0);
    for (const log of logs) {
      hourCounts[log.timestamp.getHours()]++;
    }

    return hourCounts.map((count, hour) => ({ hour, count }));
  }
}
