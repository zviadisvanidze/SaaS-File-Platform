import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company, CompanyDocument } from './company.schema';
import { CreateCompanyInput } from './company.service.types';
import { SubscriptionPlan } from '../../common/enums/plan.enum';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
  ) {}

  async findByRegistrationNumber(
    registrationNumber: string,
  ): Promise<CompanyDocument | null> {
    return this.companyModel.findOne({ registrationNumber });
  }

  async findById(id: Types.ObjectId | string): Promise<CompanyDocument> {
    const company = await this.companyModel.findById(id);
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async createCompany(input: CreateCompanyInput): Promise<CompanyDocument> {
    return this.companyModel.create({
      name: input.name,
      registrationNumber: input.registrationNumber,
      country: input.country,
      industry: input.industry,
      subscription: {
        plan: SubscriptionPlan.FREE,
        activatedAt: new Date(),
        billingAnchorDay: new Date().getDate(),
      },
    });
  }

  async updateProfile(
    companyId: Types.ObjectId | string,
    dto: UpdateCompanyDto,
  ): Promise<CompanyDocument> {
    const company = await this.companyModel.findByIdAndUpdate(
      companyId,
      { $set: dto },
      { new: true },
    );
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async changePlan(
    companyId: Types.ObjectId | string,
    plan: SubscriptionPlan,
  ): Promise<CompanyDocument> {
    const company = await this.companyModel.findByIdAndUpdate(
      companyId,
      {
        $set: {
          'subscription.plan': plan,
          'subscription.activatedAt': new Date(),
          'subscription.billingAnchorDay': new Date().getDate(),
        },
      },
      { new: true },
    );
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }
}
