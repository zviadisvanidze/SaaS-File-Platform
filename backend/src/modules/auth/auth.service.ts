import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { MailService } from '../mail/mail.service';
import { LogsService } from '../logs/logs.service';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role } from '../../common/enums/role.enum';
import { UserDocument } from '../users/user.schema';

const SALT_ROUNDS = 10;

export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
    companyId: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly mailService: MailService,
    private readonly logsService: LogsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async registerCompany(
    dto: RegisterCompanyDto,
  ): Promise<{ companyId: string }> {
    const [existingCompany, existingUser] = await Promise.all([
      this.companiesService.findByRegistrationNumber(dto.registrationNumber),
      this.usersService.findByEmail(dto.email),
    ]);

    if (existingCompany) {
      throw new ConflictException(
        'A company with this registration number already exists',
      );
    }
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const company = await this.companiesService.createCompany({
      name: dto.companyName,
      registrationNumber: dto.registrationNumber,
      country: dto.country,
      industry: dto.industry,
    });

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const admin = await this.usersService.createUser({
      email: dto.email,
      passwordHash,
      role: Role.ADMIN,
      companyId: company._id,
      isActive: false,
    });

    const token = await this.usersService.setActivationToken(admin._id);
    const frontendUrl = this.configService.get<string>('app.frontendUrl') ?? '';
    const activationUrl = `${frontendUrl}/activate/${token}`;
    await this.mailService.sendCompanyActivationEmail(
      admin.email,
      activationUrl,
    );
    await this.logsService.record(
      company._id,
      admin._id,
      'company.registered',
      {
        email: admin.email,
      },
    );

    return { companyId: company.id };
  }

  async activateCompany(token: string): Promise<void> {
    const user = await this.usersService.findByActivationToken(token);
    if (!user || user.role !== Role.ADMIN) {
      throw new BadRequestException('Invalid or expired activation link');
    }
    await this.usersService.activateUser(user._id);
    await this.logsService.record(
      user.companyId,
      user._id,
      'company.activated',
      {},
    );
  }

  async activateEmployee(token: string, password: string): Promise<void> {
    const user = await this.usersService.findByActivationToken(token);
    if (!user || user.role !== Role.EMPLOYEE) {
      throw new BadRequestException('Invalid or expired activation link');
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.usersService.activateUserWithPassword(user._id, passwordHash);
    await this.logsService.record(
      user.companyId,
      user._id,
      'employee.activated',
      {},
    );
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is not activated yet. Please check your email.',
      );
    }
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResult(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const matches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.usersService.updatePassword(user._id, passwordHash);
    await this.logsService.record(
      user.companyId,
      user._id,
      'user.password_changed',
      {},
    );
  }

  private buildAuthResult(user: UserDocument): AuthResult {
    const payload = {
      sub: user.id,
      companyId: user.companyId.toString(),
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId.toString(),
      },
    };
  }
}
