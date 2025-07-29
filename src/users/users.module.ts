import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { KeycloakModule } from '../keycloak/keycloak.module';
import { StorageModule } from '../storage/storage.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [KeycloakModule, StorageModule, PermissionsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}