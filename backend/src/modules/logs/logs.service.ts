import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit-log.schema';

@Injectable()
export class LogsService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async record(
    companyId: Types.ObjectId | string,
    actorId: Types.ObjectId | string | null,
    action: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.auditLogModel.create({ companyId, actorId, action, metadata });
  }

  async listForCompany(
    companyId: Types.ObjectId | string,
    limit = 100,
  ): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({ companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actorId', 'email firstName lastName role');
  }
}
