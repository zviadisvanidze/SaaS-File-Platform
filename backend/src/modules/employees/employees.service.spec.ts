import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EmployeesService } from './employees.service';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { MailService } from '../mail/mail.service';
import { SubscriptionPlan } from '../../common/enums/plan.enum';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let usersService: {
    findByEmail: jest.Mock;
    countEmployees: jest.Mock;
    createUser: jest.Mock;
    setActivationToken: jest.Mock;
  };
  let companiesService: { findById: jest.Mock };
  let mailService: { sendEmployeeInviteEmail: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      countEmployees: jest.fn(),
      createUser: jest.fn(),
      setActivationToken: jest.fn(),
    };
    companiesService = { findById: jest.fn() };
    mailService = { sendEmployeeInviteEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: UsersService, useValue: usersService },
        { provide: CompaniesService, useValue: companiesService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(EmployeesService);
  });

  it('rejects adding an employee on the free plan', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    companiesService.findById.mockResolvedValue({
      name: 'Acme',
      subscription: { plan: SubscriptionPlan.FREE },
    });
    usersService.countEmployees.mockResolvedValue(0);

    await expect(
      service.addEmployee(
        new Types.ObjectId().toString(),
        { email: 'new@acme.test' },
        'http://localhost:3000',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects adding an employee once the basic plan limit of 10 is reached', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    companiesService.findById.mockResolvedValue({
      name: 'Acme',
      subscription: { plan: SubscriptionPlan.BASIC },
    });
    usersService.countEmployees.mockResolvedValue(10);

    await expect(
      service.addEmployee(
        new Types.ObjectId().toString(),
        { email: 'new@acme.test' },
        'http://localhost:3000',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates and invites the employee when under the plan limit', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    companiesService.findById.mockResolvedValue({
      name: 'Acme',
      subscription: { plan: SubscriptionPlan.BASIC },
    });
    usersService.countEmployees.mockResolvedValue(2);
    const createdId = new Types.ObjectId();
    usersService.createUser.mockResolvedValue({
      _id: createdId,
      email: 'new@acme.test',
    });
    usersService.setActivationToken.mockResolvedValue('token-123');

    await service.addEmployee(
      new Types.ObjectId().toString(),
      { email: 'new@acme.test' },
      'http://localhost:3000',
    );

    expect(mailService.sendEmployeeInviteEmail).toHaveBeenCalledWith(
      'new@acme.test',
      'http://localhost:3000/employee-activate/token-123',
      'Acme',
    );
  });
});
