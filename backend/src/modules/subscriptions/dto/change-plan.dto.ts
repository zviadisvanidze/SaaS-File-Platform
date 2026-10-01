import { IsEnum } from 'class-validator';
import { SubscriptionPlan } from '../../../common/enums/plan.enum';

export class ChangePlanDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;
}
