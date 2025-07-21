import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { KeycloakModule } from '../keycloak/keycloak.module';
import { Permission, PermissionSchema } from './schemas/permission.schema';

@Module({
  imports: [
    KeycloakModule,
    MongooseModule.forFeature([{ name: Permission.name, schema: PermissionSchema }]),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}