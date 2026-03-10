import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
} from './dto/users.dto.js';
import { Roles, CurrentUser } from '../common/decorators/index.js';
import { Role } from '../../generated/prisma/client.js';

@ApiTags('Users — Gestión de Usuarios')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Crear usuario',
    description: 'Crea un nuevo usuario con rol asignado. Solo ADMIN.',
  })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar usuarios',
    description:
      'Retorna todos los usuarios del sistema (sin campo password). Solo ADMIN.',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  findAll() {
    return this.users.findAll();
  }

  @Get('me')
  @ApiOperation({
    summary: 'Obtener perfil propio',
    description: 'Retorna los datos del usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Datos del usuario autenticado' })
  getMe(@CurrentUser() user: { id: number }) {
    return this.users.findOne(user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Datos del usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.users.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Actualizar usuario',
    description:
      'Modifica email, rol o estado activo de un usuario. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del usuario a modificar',
  })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Patch('me/password')
  @ApiOperation({
    summary: 'Cambiar contraseña propia',
    description:
      'El usuario autenticado cambia su propia contraseña. No puede reutilizar las últimas 5 contraseñas.',
  })
  @ApiResponse({ status: 200, description: 'Contraseña cambiada exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Contraseña actual incorrecta o reuso de contraseña reciente',
  })
  changePassword(
    @CurrentUser() user: { id: number },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.users.changePassword(user.id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Desactivar usuario',
    description:
      'Desactiva la cuenta del usuario (soft delete — nunca se elimina físicamente). Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del usuario a desactivar',
  })
  @ApiResponse({ status: 200, description: 'Usuario desactivado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.users.remove(id);
  }
}
