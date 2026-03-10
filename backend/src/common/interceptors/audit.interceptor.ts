import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditAction } from '../../../generated/prisma/client.js';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const { method, url, ip, headers } = req;
    const userId: number | undefined = req.user?.id;
    const userAgent = headers['user-agent'] ?? null;

    const action = this.mapHttpMethodToAction(method);
    const { resourceType, resourceId } = this.extractResource(url);

    return next.handle().pipe(
      tap({
        next: () => {
          this.saveLog({
            userId: userId ?? null,
            action,
            resourceType,
            resourceId,
            ipAddress: ip ?? null,
            userAgent,
            httpMethod: method,
            endpoint: url,
            statusCode: res.statusCode,
          });
        },
        error: (err: { status?: number }) => {
          this.saveLog({
            userId: userId ?? null,
            action,
            resourceType,
            resourceId,
            ipAddress: ip ?? null,
            userAgent,
            httpMethod: method,
            endpoint: url,
            statusCode: err.status ?? 500,
          });
        },
      }),
    );
  }

  private mapHttpMethodToAction(method: string): AuditAction {
    switch (method.toUpperCase()) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return AuditAction.READ;
    }
  }

  private extractResource(url: string): {
    resourceType: string;
    resourceId: string | null;
  } {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    // e.g. /patients/5 → resourceType = "patients", resourceId = "5"
    const resourceType = parts[0] ?? 'unknown';
    const lastPart = parts[parts.length - 1];
    const resourceId =
      parts.length > 1 && /^\d+$/.test(lastPart) ? lastPart : null;
    return { resourceType, resourceId };
  }

  private saveLog(data: {
    userId: number | null;
    action: AuditAction;
    resourceType: string;
    resourceId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    httpMethod: string;
    endpoint: string;
    statusCode: number;
  }) {
    // Fire-and-forget — no await so we don't slow the request
    this.prisma.auditLog
      .create({ data })
      .catch((err: unknown) =>
        console.error('Escritura de log de auditoría fallida:', err),
      );
  }
}
