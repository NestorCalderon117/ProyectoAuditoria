import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service.js';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
} from './dto/medical-records.dto.js';
import { Roles, CurrentUser } from '../common/decorators/index.js';
import { Role } from '../../generated/prisma/client.js';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Medical Records — Registros Médicos (PHI)')
@ApiBearerAuth()
@Controller('medical-records')
@Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE)
export class MedicalRecordsController {
  constructor(private medicalRecords: MedicalRecordsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({
    summary: 'Crear registro médico',
    description:
      'Crea un nuevo registro médico asociado a un paciente. El contenido se cifra con AES-256-CBC. Solo ADMIN y DOCTOR.',
  })
  @ApiResponse({ status: 201, description: 'Registro creado exitosamente' })
  create(
    @Body() dto: CreateMedicalRecordDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.medicalRecords.create(dto, user.id);
  }

  @Get('patient/:patientId')
  @ApiOperation({
    summary: 'Listar registros por paciente',
    description:
      'Retorna todos los registros médicos de un paciente con contenido descifrado.',
  })
  @ApiParam({ name: 'patientId', type: Number, description: 'ID del paciente' })
  @ApiResponse({ status: 200, description: 'Lista de registros médicos' })
  findByPatient(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.medicalRecords.findByPatient(patientId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener registro médico por ID',
    description:
      'Retorna un registro médico individual con contenido descifrado.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID del registro médico' })
  @ApiResponse({
    status: 200,
    description: 'Registro médico con contenido descifrado',
  })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.medicalRecords.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({
    summary: 'Actualizar registro médico',
    description:
      'Modifica un registro médico existente. El contenido se recifra automáticamente. Solo ADMIN y DOCTOR.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del registro a modificar',
  })
  @ApiResponse({ status: 200, description: 'Registro actualizado' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMedicalRecordDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.medicalRecords.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Eliminar registro médico',
    description: 'Elimina un registro médico. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del registro a eliminar',
  })
  @ApiResponse({ status: 200, description: 'Registro eliminado' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.medicalRecords.remove(id);
  }

  @Post(':id/image')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Subir imagen medica',
    description:
      'Sube imagen (PNG/JPG/DICOM) a Azure Blob y actualiza el Blob Key del registro.',
  })
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Debe enviar un archivo.');
    return this.medicalRecords.uploadImage(id, user.id, file);
  }

  @Get(':id/image-url')
  @ApiOperation({
    summary: 'Generar URL temporal de descarga',
    description:
      'Genera URL SAS de lectura para descargar/visualizar la imagen medica.',
  })
  getImageUrl(@Param('id', ParseIntPipe) id: number) {
    return this.medicalRecords.getImageSasUrl(id);
  }

  @Delete(':id/image')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({
    summary: 'Eliminar imagen asociada',
    description: 'Elimina el blob en Azure y limpia el Blob Key del registro.',
  })
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.medicalRecords.removeImage(id, user.id);
  }
}
