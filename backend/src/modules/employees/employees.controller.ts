import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Role } from '../../common/enums/role.enum';
import { EmployeesService } from './employees.service';
import { AddEmployeeDto } from './dto/add-employee.dto';
import { LogsService } from '../logs/logs.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly logsService: LogsService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.listEmployees(user.companyId);
  }

  @Post()
  async add(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddEmployeeDto,
  ) {
    const frontendUrl = this.configService.get<string>('app.frontendUrl') ?? '';
    const employee = await this.employeesService.addEmployee(
      user.companyId,
      dto,
      frontendUrl,
    );
    await this.logsService.record(
      user.companyId,
      user.userId,
      'employee.added',
      {
        employeeId: employee.id,
        email: employee.email,
      },
    );
    return employee;
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.employeesService.removeEmployee(user.companyId, id);
    await this.logsService.record(
      user.companyId,
      user.userId,
      'employee.removed',
      {
        employeeId: id,
      },
    );
    return { success: true };
  }
}
