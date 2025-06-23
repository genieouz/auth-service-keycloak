import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersScheduledTasks } from './users.scheduled-tasks';
import { KeycloakModule } from '../keycloak/keycloak.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [KeycloakModule, StorageModule],
  controllers: [UsersController],
  providers: [UsersService, UsersScheduledTasks],
})
export class UsersModule {}