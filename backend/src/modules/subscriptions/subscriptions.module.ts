import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { FilesModule } from '../files/files.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [CompaniesModule, UsersModule, FilesModule, LogsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
