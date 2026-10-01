import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { MailService } from '../mail/mail.service';
import { AddEmployeeDto } from './dto/add-employee.dto';
import { Role } from '../../common/enums/role.enum';
import { getPlanDefinition } from '../subscriptions/plans.config';

const SALT_ROUNDS = 10;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly mailService: MailService,
  ) {}

  async listEmployees(companyId: string) {
    return this.usersService.listEmployees(companyId);
  }

  async addEmployee(
    companyId: string,
    dto: AddEmployeeDto,
    frontendUrl: string,
  ) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const company = await this.companiesService.findById(companyId);
    const definition = getPlanDefinition(company.subscription.plan);
    const employeeCount = await this.usersService.countEmployees(companyId);

    if (employeeCount >= definition.maxEmployees) {
      throw new BadRequestException(
        `The ${definition.label} plan allows up to ${definition.maxEmployees} employees. ` +
          'Upgrade your subscription to add more.',
      );
    }

    const temporaryPasswordHash = await bcrypt.hash(
      randomBytes(24).toString('hex'),
      SALT_ROUNDS,
    );

    const employee = await this.usersService.createUser({
      email: dto.email,
      passwordHash: temporaryPasswordHash,
      role: Role.EMPLOYEE,
      companyId: new Types.ObjectId(companyId),
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: false,
    });

    const token = await this.usersService.setActivationToken(employee._id);
    const activationUrl = `${frontendUrl}/employee-activate/${token}`;
    await this.mailService.sendEmployeeInviteEmail(
      employee.email,
      activationUrl,
      company.name,
    );

    return employee;
  }

  async removeEmployee(companyId: string, employeeId: string): Promise<void> {
    const employees = await this.usersService.findEmployeesByIds(
      [employeeId],
      companyId,
    );
    if (employees.length === 0) {
      throw new NotFoundException('Employee not found');
    }
    await this.usersService.deleteUser(employeeId);
  }
}
