import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { KeycloakModule } from '../keycloak/keycloak.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [KeycloakModule, StorageModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}