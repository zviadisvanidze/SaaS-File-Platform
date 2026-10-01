import { BadRequestException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CompaniesService } from '../companies/companies.service';
import { UsersService } from '../users/users.service';
import { FilesService } from '../files/files.service';
import { SubscriptionPlan } from '../../common/enums/plan.enum';
import { getPlanDefinition, PLAN_DEFINITIONS } from './plans.config';

export interface SubscriptionOverview {
  plan: SubscriptionPlan;
  label: string;
  activatedAt: Date;
  billingAnchorDay: number;
  limits: {
    maxFilesPerMonth: number;
    maxEmployees: number | null;
  };
  usage: {
    filesThisMonth: number;
    employeeCount: number;
  };
  availablePlans: typeof PLAN_DEFINITIONS;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly usersService: UsersService,
    private readonly filesService: FilesService,
  ) {}

  async getOverview(
    companyId: Types.ObjectId | string,
  ): Promise<SubscriptionOverview> {
    const company = await this.companiesService.findById(companyId);
    const definition = getPlanDefinition(company.subscription.plan);
    const [filesThisMonth, employeeCount] = await Promise.all([
      this.filesService.countFilesThisMonth(companyId),
      this.usersService.countEmployees(companyId),
    ]);

    return {
      plan: company.subscription.plan,
      label: definition.label,
      activatedAt: company.subscription.activatedAt,
      billingAnchorDay: company.subscription.billingAnchorDay,
      limits: {
        maxFilesPerMonth: definition.maxFilesPerMonth,
        maxEmployees: Number.isFinite(definition.maxEmployees)
          ? definition.maxEmployees
          : null,
      },
      usage: { filesThisMonth, employeeCount },
      availablePlans: PLAN_DEFINITIONS,
    };
  }

  async changePlan(companyId: Types.ObjectId | string, plan: SubscriptionPlan) {
    const definition = getPlanDefinition(plan);
    const employeeCount = await this.usersService.countEmployees(companyId);

    if (employeeCount > definition.maxEmployees) {
      throw new BadRequestException(
        `Cannot switch to the ${definition.label} plan: it allows up to ` +
          `${definition.maxEmployees} employees, but this company currently has ${employeeCount}. ` +
          'Remove employees before downgrading.',
      );
    }

    return this.companiesService.changePlan(companyId, plan);
  }
}
