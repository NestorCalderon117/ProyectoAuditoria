import { Module } from '@nestjs/common';
import { HipaaControlsService } from './hipaa-controls.service.js';
import { HipaaControlsController } from './hipaa-controls.controller.js';

@Module({
  controllers: [HipaaControlsController],
  providers: [HipaaControlsService],
  exports: [HipaaControlsService],
})
export class HipaaControlsModule {}
