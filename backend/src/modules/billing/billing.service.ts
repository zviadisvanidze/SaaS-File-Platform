import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CompaniesService } from '../companies/companies.service';
import { UsersService } from '../users/users.service';
import { FilesService } from '../files/files.service';
import { getPlanDefinition } from '../subscriptions/plans.config';
import { SubscriptionPlan } from '../../common/enums/plan.enum';

export interface BillingSummary {
  plan: SubscriptionPlan;
  planLabel: string;
  billingAnchorDay: number;
  nextDueDate: Date;
  employeeCount: number;
  filesThisMonth: number;
  breakdown: {
    basePricePerMonth: number;
    employeeCharges: number;
    overageFiles: number;
    overageCharges: number;
  };
  amountDueUsd: number;
}

function computeNextDueDate(anchorDay: number, from: Date): Date {
  const daysInCurrentMonth = new Date(
    from.getFullYear(),
    from.getMonth() + 1,
    0,
  ).getDate();
  const clampedDay = Math.min(anchorDay, daysInCurrentMonth);
  const candidate = new Date(from.getFullYear(), from.getMonth(), clampedDay);

  if (candidate >= from) {
    return candidate;
  }

  const daysInNextMonth = new Date(
    from.getFullYear(),
    from.getMonth() + 2,
    0,
  ).getDate();
  return new Date(
    from.getFullYear(),
    from.getMonth() + 1,
    Math.min(anchorDay, daysInNextMonth),
  );
}

@Injectable()
export class BillingService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly usersService: UsersService,
    private readonly filesService: FilesService,
  ) {}

  async getCurrentBilling(
    companyId: Types.ObjectId | string,
  ): Promise<BillingSummary> {
    const company = await this.companiesService.findById(companyId);
    const definition = getPlanDefinition(company.subscription.plan);
    const [employeeCount, filesThisMonth] = await Promise.all([
      this.usersService.countEmployees(companyId),
      this.filesService.countFilesThisMonth(companyId),
    ]);

    const employeeCharges = employeeCount * definition.pricePerEmployee;
    const overageFiles = Math.max(
      0,
      filesThisMonth - definition.maxFilesPerMonth,
    );
    const overageCharges =
      definition.plan === 'premium'
        ? overageFiles * definition.overageFilePrice
        : 0;

    const amountDueUsd =
      definition.basePricePerMonth + employeeCharges + overageCharges;

    return {
      plan: definition.plan,
      planLabel: definition.label,
      billingAnchorDay: company.subscription.billingAnchorDay,
      nextDueDate: computeNextDueDate(
        company.subscription.billingAnchorDay,
        new Date(),
      ),
      employeeCount,
      filesThisMonth,
      breakdown: {
        basePricePerMonth: definition.basePricePerMonth,
        employeeCharges,
        overageFiles,
        overageCharges,
      },
      amountDueUsd,
    };
  }
}
