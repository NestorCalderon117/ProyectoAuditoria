import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/users.dto.js';

const PASSWORD_HISTORY_LIMIT = 5;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('El Email ya está registrado');

    const hash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hash,
        role: dto.role,
        passwordHistory: { create: { hash } },
      },
      select: this.safeSelect,
    });
    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({ select: this.safeSelect });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.safeSelect,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: this.safeSelect,
    });
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new BadRequestException('La contraseña actual es incorrecta');

    // Check last 5 passwords
    const history = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: PASSWORD_HISTORY_LIMIT,
    });

    for (const entry of history) {
      if (await bcrypt.compare(dto.newPassword, entry.hash)) {
        throw new BadRequestException(
          `No puedes reutilizar cualquiera de tus últimas ${PASSWORD_HISTORY_LIMIT} contraseñas`,
        );
      }
    }

    const hash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { password: hash, pwdChangedAt: new Date() },
      }),
      this.prisma.passwordHistory.create({
        data: { userId, hash },
      }),
    ]);

    return { message: 'Contraseña cambiada exitosamente' };
  }

  async remove(id: number) {
    await this.findOne(id);
    // Soft disable — never physically delete users
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: this.safeSelect,
    });
  }

  private safeSelect = {
    id: true,
    email: true,
    role: true,
    isActive: true,
    mfaEnabled: true,
    failedAttempts: true,
    lockedUntil: true,
    lastLogin: true,
    pwdChangedAt: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}
