import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { Resource, ResourceSchema } from './schemas/resource.schema';

@Module({
  imports: [
    PermissionsModule,
    MongooseModule.forFeature([{ name: Resource.name, schema: ResourceSchema }]),
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}