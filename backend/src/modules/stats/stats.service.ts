import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FileAsset, FileAssetDocument } from '../files/file.schema';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { getPlanDefinition } from '../subscriptions/plans.config';

export interface StatsOverview {
  plan: string;
  employeeCount: number;
  totalFiles: number;
  filesThisMonth: number;
  totalStorageBytes: number;
  filesByEmployee: { userId: string; email: string; fileCount: number }[];
}

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(FileAsset.name)
    private readonly fileModel: Model<FileAssetDocument>,
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
  ) {}

  async getOverview(
    companyId: Types.ObjectId | string,
  ): Promise<StatsOverview> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      company,
      employeeCount,
      totalFiles,
      filesThisMonth,
      storageAgg,
      byEmployee,
    ] = await Promise.all([
      this.companiesService.findById(companyId),
      this.usersService.countEmployees(companyId),
      this.fileModel.countDocuments({ companyId }),
      this.fileModel.countDocuments({
        companyId,
        createdAt: { $gte: startOfMonth },
      }),
      this.fileModel.aggregate<{ _id: null; totalSize: number }>([
        { $match: { companyId: new Types.ObjectId(companyId) } },
        { $group: { _id: null, totalSize: { $sum: '$size' } } },
      ]),
      this.fileModel.aggregate<{
        _id: Types.ObjectId;
        fileCount: number;
        email: string;
      }>([
        { $match: { companyId: new Types.ObjectId(companyId) } },
        { $group: { _id: '$uploadedBy', fileCount: { $sum: 1 } } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        { $project: { fileCount: 1, email: '$user.email' } },
      ]),
    ]);

    return {
      plan: getPlanDefinition(company.subscription.plan).label,
      employeeCount,
      totalFiles,
      filesThisMonth,
      totalStorageBytes: storageAgg[0]?.totalSize ?? 0,
      filesByEmployee: byEmployee.map((entry) => ({
        userId: entry._id.toString(),
        email: entry.email,
        fileCount: entry.fileCount,
      })),
    };
  }
}
