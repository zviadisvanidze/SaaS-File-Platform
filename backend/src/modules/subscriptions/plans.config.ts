import { SubscriptionPlan } from '../../common/enums/plan.enum';

export interface PlanDefinition {
  readonly plan: SubscriptionPlan;
  readonly label: string;
  readonly maxFilesPerMonth: number;
  readonly maxEmployees: number;
  readonly basePricePerMonth: number;
  readonly pricePerEmployee: number;
  readonly overageFilePrice: number;
}

export const PLAN_DEFINITIONS: Record<SubscriptionPlan, PlanDefinition> = {
  [SubscriptionPlan.FREE]: {
    plan: SubscriptionPlan.FREE,
    label: 'Free',
    maxFilesPerMonth: 10,
    maxEmployees: 0,
    basePricePerMonth: 0,
    pricePerEmployee: 0,
    overageFilePrice: 0,
  },
  [SubscriptionPlan.BASIC]: {
    plan: SubscriptionPlan.BASIC,
    label: 'Basic',
    maxFilesPerMonth: 100,
    maxEmployees: 10,
    basePricePerMonth: 0,
    pricePerEmployee: 5,
    overageFilePrice: 0,
  },
  [SubscriptionPlan.PREMIUM]: {
    plan: SubscriptionPlan.PREMIUM,
    label: 'Premium',
    maxFilesPerMonth: 1000,
    maxEmployees: Infinity,
    basePricePerMonth: 300,
    pricePerEmployee: 0,
    overageFilePrice: 0.5,
  },
};

export function getPlanDefinition(plan: SubscriptionPlan): PlanDefinition {
  return PLAN_DEFINITIONS[plan];
}
