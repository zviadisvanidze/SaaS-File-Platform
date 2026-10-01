import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { User, UserDocument } from './user.schema';
import { Role } from '../../common/enums/role.enum';

const ACTIVATION_TOKEN_TTL_HOURS = 48;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async findByActivationToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      activationToken: token,
      activationTokenExpiresAt: { $gt: new Date() },
    });
  }

  async countEmployees(companyId: Types.ObjectId | string): Promise<number> {
    return this.userModel.countDocuments({
      companyId,
      role: Role.EMPLOYEE,
    });
  }

  async listEmployees(
    companyId: Types.ObjectId | string,
  ): Promise<UserDocument[]> {
    return this.userModel
      .find({ companyId, role: Role.EMPLOYEE })
      .sort({ createdAt: -1 });
  }

  /**
   * Minimal, non-sensitive member directory (id/name/email only) so that any
   * authenticated company member can pick recipients when restricting file
   * visibility, without exposing the full employee-management roster.
   */
  async listCompanyMembers(
    companyId: Types.ObjectId | string,
  ): Promise<UserDocument[]> {
    return this.userModel
      .find({ companyId, role: Role.EMPLOYEE, isActive: true })
      .select('_id email firstName lastName')
      .sort({ email: 1 });
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    role: Role;
    companyId: Types.ObjectId;
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
  }): Promise<UserDocument> {
    return this.userModel.create({
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      role: data.role,
      companyId: data.companyId,
      firstName: data.firstName,
      lastName: data.lastName,
      isActive: data.isActive ?? false,
    });
  }

  generateActivationToken(): { token: string; expiresAt: Date } {
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ACTIVATION_TOKEN_TTL_HOURS);
    return { token, expiresAt };
  }

  async setActivationToken(userId: Types.ObjectId): Promise<string> {
    const { token, expiresAt } = this.generateActivationToken();
    await this.userModel.updateOne(
      { _id: userId },
      { activationToken: token, activationTokenExpiresAt: expiresAt },
    );
    return token;
  }

  async activateUser(userId: Types.ObjectId): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      {
        isActive: true,
        activationToken: null,
        activationTokenExpiresAt: null,
      },
    );
  }

  async activateUserWithPassword(
    userId: Types.ObjectId,
    passwordHash: string,
  ): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      {
        isActive: true,
        passwordHash,
        activationToken: null,
        activationTokenExpiresAt: null,
      },
    );
  }

  async updatePassword(
    userId: Types.ObjectId,
    passwordHash: string,
  ): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { passwordHash });
  }

  async deleteUser(userId: Types.ObjectId | string): Promise<void> {
    await this.userModel.deleteOne({ _id: userId });
  }

  async findEmployeesByIds(
    ids: (Types.ObjectId | string)[],
    companyId: Types.ObjectId | string,
  ): Promise<UserDocument[]> {
    return this.userModel.find({
      _id: { $in: ids },
      companyId,
      role: Role.EMPLOYEE,
    });
  }
}
