import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { FilesModule } from '../files/files.module';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [FilesModule, UsersModule, CompaniesModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
