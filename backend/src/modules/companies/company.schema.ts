import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Industry } from '../../common/enums/industry.enum';
import { SubscriptionPlan } from '../../common/enums/plan.enum';

export type CompanyDocument = HydratedDocument<Company>;

@Schema({ _id: false })
export class CompanySubscription {
  @Prop({
    type: String,
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
  })
  plan: SubscriptionPlan;

  @Prop({ type: Date, default: () => new Date() })
  activatedAt: Date;

  @Prop({ type: Number, default: () => new Date().getDate() })
  billingAnchorDay: number;
}

export const CompanySubscriptionSchema =
  SchemaFactory.createForClass(CompanySubscription);

@Schema({ timestamps: true })
export class Company {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true })
  registrationNumber: string;

  @Prop({ required: true, trim: true })
  country: string;

  @Prop({ required: true, enum: Industry })
  industry: Industry;

  @Prop({ type: CompanySubscriptionSchema, default: () => ({}) })
  subscription: CompanySubscription;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
