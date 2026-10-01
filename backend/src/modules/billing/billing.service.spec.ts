import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { CompaniesService } from '../companies/companies.service';
import { UsersService } from '../users/users.service';
import { FilesService } from '../files/files.service';
import { SubscriptionPlan } from '../../common/enums/plan.enum';

describe('BillingService', () => {
  let service: BillingService;
  let companiesService: { findById: jest.Mock };
  let usersService: { countEmployees: jest.Mock };
  let filesService: { countFilesThisMonth: jest.Mock };

  beforeEach(async () => {
    companiesService = { findById: jest.fn() };
    usersService = { countEmployees: jest.fn() };
    filesService = { countFilesThisMonth: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: CompaniesService, useValue: companiesService },
        { provide: UsersService, useValue: usersService },
        { provide: FilesService, useValue: filesService },
      ],
    }).compile();

    service = module.get(BillingService);
  });

  it('charges nothing for the free plan', async () => {
    companiesService.findById.mockResolvedValue({
      subscription: {
        plan: SubscriptionPlan.FREE,
        billingAnchorDay: 15,
      },
    });
    usersService.countEmployees.mockResolvedValue(0);
    filesService.countFilesThisMonth.mockResolvedValue(3);

    const result = await service.getCurrentBilling('company-1');

    expect(result.amountDueUsd).toBe(0);
  });

  it('charges 5 USD per employee on the basic plan', async () => {
    companiesService.findById.mockResolvedValue({
      subscription: {
        plan: SubscriptionPlan.BASIC,
        billingAnchorDay: 15,
      },
    });
    usersService.countEmployees.mockResolvedValue(4);
    filesService.countFilesThisMonth.mockResolvedValue(20);

    const result = await service.getCurrentBilling('company-1');

    expect(result.amountDueUsd).toBe(20);
    expect(result.breakdown.employeeCharges).toBe(20);
  });

  it('charges the fixed premium fee plus 0.5 USD per file over 1000', async () => {
    companiesService.findById.mockResolvedValue({
      subscription: {
        plan: SubscriptionPlan.PREMIUM,
        billingAnchorDay: 15,
      },
    });
    usersService.countEmployees.mockResolvedValue(50);
    filesService.countFilesThisMonth.mockResolvedValue(1200);

    const result = await service.getCurrentBilling('company-1');

    expect(result.breakdown.overageFiles).toBe(200);
    expect(result.breakdown.overageCharges).toBe(100);
    expect(result.amountDueUsd).toBe(400);
  });
});
