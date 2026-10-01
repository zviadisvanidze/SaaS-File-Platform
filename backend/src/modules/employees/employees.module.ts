import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { MailModule } from '../mail/mail.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [UsersModule, CompaniesModule, MailModule, LogsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
