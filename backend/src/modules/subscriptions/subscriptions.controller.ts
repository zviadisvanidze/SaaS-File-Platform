import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Role } from '../../common/enums/role.enum';
import { SubscriptionsService } from './subscriptions.service';
import { ChangePlanDto } from './dto/change-plan.dto';
import { LogsService } from '../logs/logs.service';

@Controller('subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  async getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getOverview(user.companyId);
  }

  @Patch()
  @Roles(Role.ADMIN)
  async changePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePlanDto,
  ) {
    const company = await this.subscriptionsService.changePlan(
      user.companyId,
      dto.plan,
    );
    await this.logsService.record(
      user.companyId,
      user.userId,
      'subscription.plan_changed',
      {
        plan: dto.plan,
      },
    );
    return company;
  }
}
