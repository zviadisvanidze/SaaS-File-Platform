import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CompaniesService } from '../companies/companies.service';
import { UsersService } from '../users/users.service';
import { FilesService } from '../files/files.service';
import { SubscriptionPlan } from '../../common/enums/plan.enum';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let companiesService: { changePlan: jest.Mock; findById: jest.Mock };
  let usersService: { countEmployees: jest.Mock };
  let filesService: { countFilesThisMonth: jest.Mock };

  beforeEach(async () => {
    companiesService = { changePlan: jest.fn(), findById: jest.fn() };
    usersService = { countEmployees: jest.fn() };
    filesService = { countFilesThisMonth: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: CompaniesService, useValue: companiesService },
        { provide: UsersService, useValue: usersService },
        { provide: FilesService, useValue: filesService },
      ],
    }).compile();

    service = module.get(SubscriptionsService);
  });

  it('rejects downgrading to free when the company still has employees', async () => {
    usersService.countEmployees.mockResolvedValue(3);

    await expect(
      service.changePlan('company-1', SubscriptionPlan.FREE),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(companiesService.changePlan).not.toHaveBeenCalled();
  });

  it('rejects downgrading to basic when employee count exceeds 10', async () => {
    usersService.countEmployees.mockResolvedValue(11);

    await expect(
      service.changePlan('company-1', SubscriptionPlan.BASIC),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows switching plan when employee count fits the new limit', async () => {
    usersService.countEmployees.mockResolvedValue(2);
    companiesService.changePlan.mockResolvedValue({ subscription: {} });

    await service.changePlan('company-1', SubscriptionPlan.BASIC);

    expect(companiesService.changePlan).toHaveBeenCalledWith(
      'company-1',
      SubscriptionPlan.BASIC,
    );
  });
});
