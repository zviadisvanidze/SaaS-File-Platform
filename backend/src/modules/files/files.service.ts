import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FileAsset, FileAssetDocument } from './file.schema';
import { S3Service } from './s3.service';
import { CompaniesService } from '../companies/companies.service';
import { UsersService } from '../users/users.service';
import { FileVisibility } from '../../common/enums/file-visibility.enum';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { getPlanDefinition } from '../subscriptions/plans.config';
import { hasAllowedExtension } from './files.constants';

interface UploadFileParams {
  companyId: string;
  uploadedBy: string;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  size: number;
  visibility: FileVisibility;
  allowedUserIds: string[];
}

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(FileAsset.name)
    private readonly fileModel: Model<FileAssetDocument>,
    private readonly s3Service: S3Service,
    private readonly companiesService: CompaniesService,
    private readonly usersService: UsersService,
  ) {}

  private async assertValidAllowedUsers(
    companyId: string,
    allowedUserIds: string[],
  ): Promise<void> {
    if (allowedUserIds.length === 0) {
      return;
    }
    const employees = await this.usersService.findEmployeesByIds(
      allowedUserIds,
      companyId,
    );
    if (employees.length !== new Set(allowedUserIds).size) {
      throw new BadRequestException(
        'allowedUserIds must reference existing employees of this company',
      );
    }
  }

  async countFilesThisMonth(
    companyId: Types.ObjectId | string,
  ): Promise<number> {
    return this.fileModel.countDocuments({
      companyId,
      createdAt: { $gte: startOfCurrentMonth() },
    });
  }

  async listVisibleToUser(
    user: AuthenticatedUser,
  ): Promise<FileAssetDocument[]> {
    if (user.role === Role.ADMIN) {
      return this.fileModel
        .find({ companyId: user.companyId })
        .sort({ createdAt: -1 })
        .populate('uploadedBy', 'email firstName lastName');
    }

    return this.fileModel
      .find({
        companyId: user.companyId,
        $or: [
          { visibility: FileVisibility.ALL },
          { uploadedBy: user.userId },
          { allowedUsers: user.userId },
        ],
      })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'email firstName lastName');
  }

  private async findOwnedOrAdmin(
    fileId: string,
    user: AuthenticatedUser,
  ): Promise<FileAssetDocument> {
    const file = await this.fileModel.findOne({
      _id: fileId,
      companyId: user.companyId,
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    const isOwner = file.uploadedBy.toString() === user.userId;
    const isAdmin = user.role === Role.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'Only the uploader or a company admin can modify this file',
      );
    }
    return file;
  }

  async uploadFile(params: UploadFileParams): Promise<FileAssetDocument> {
    if (!hasAllowedExtension(params.originalName)) {
      throw new BadRequestException('Only CSV, XLS and XLSX files are allowed');
    }

    const company = await this.companiesService.findById(params.companyId);
    const definition = getPlanDefinition(company.subscription.plan);
    const filesThisMonth = await this.countFilesThisMonth(params.companyId);

    if (
      definition.plan !== 'premium' &&
      filesThisMonth >= definition.maxFilesPerMonth
    ) {
      throw new BadRequestException(
        `The ${definition.label} plan allows up to ${definition.maxFilesPerMonth} files per month. ` +
          'Upgrade your subscription to upload more.',
      );
    }

    if (params.visibility === FileVisibility.RESTRICTED) {
      await this.assertValidAllowedUsers(
        params.companyId,
        params.allowedUserIds,
      );
    }

    const key = this.s3Service.buildObjectKey(
      params.companyId,
      params.originalName,
    );
    await this.s3Service.uploadObject(key, params.buffer, params.mimeType);

    return this.fileModel.create({
      companyId: params.companyId,
      uploadedBy: params.uploadedBy,
      originalName: params.originalName,
      s3Key: key,
      mimeType: params.mimeType,
      size: params.size,
      visibility: params.visibility,
      allowedUsers:
        params.visibility === FileVisibility.RESTRICTED
          ? params.allowedUserIds
          : [],
    });
  }

  async updateVisibility(
    fileId: string,
    user: AuthenticatedUser,
    visibility: FileVisibility,
    allowedUserIds: string[],
  ): Promise<FileAssetDocument> {
    const file = await this.findOwnedOrAdmin(fileId, user);
    if (visibility === FileVisibility.RESTRICTED) {
      await this.assertValidAllowedUsers(user.companyId, allowedUserIds);
    }
    file.visibility = visibility;
    file.allowedUsers =
      visibility === FileVisibility.RESTRICTED
        ? allowedUserIds.map((id) => new Types.ObjectId(id))
        : [];
    await file.save();
    return file;
  }

  async deleteFile(fileId: string, user: AuthenticatedUser): Promise<void> {
    const file = await this.findOwnedOrAdmin(fileId, user);
    await this.s3Service.deleteObject(file.s3Key);
    await file.deleteOne();
  }

  async getDownloadUrl(
    fileId: string,
    user: AuthenticatedUser,
  ): Promise<string> {
    const file = await this.fileModel.findOne({
      _id: fileId,
      companyId: user.companyId,
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const canView =
      user.role === Role.ADMIN ||
      file.uploadedBy.toString() === user.userId ||
      file.visibility === FileVisibility.ALL ||
      file.allowedUsers.some((id) => id.toString() === user.userId);

    if (!canView) {
      throw new ForbiddenException('You do not have access to this file');
    }

    return this.s3Service.getDownloadUrl(file.s3Key);
  }
}
