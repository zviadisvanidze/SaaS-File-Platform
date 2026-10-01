import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Role } from '../../common/enums/role.enum';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { LogsService } from '../logs/logs.service';
import { UsersService } from '../users/users.service';

@Controller('company')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly logsService: LogsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.findById(user.companyId);
  }

  /**
   * Lightweight member directory used to pick recipients when restricting a
   * file's visibility. Intentionally excludes activation status and does not
   * allow management actions, since only admins may access the full roster.
   */
  @Get('members')
  async getMembers(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listCompanyMembers(user.companyId);
  }

  @Patch('profile')
  @Roles(Role.ADMIN)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanyDto,
  ) {
    const company = await this.companiesService.updateProfile(
      user.companyId,
      dto,
    );
    await this.logsService.record(
      user.companyId,
      user.userId,
      'company.profile_updated',
      { ...dto },
    );
    return company;
  }
}
