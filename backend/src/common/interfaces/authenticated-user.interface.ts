import { Role } from '../enums/role.enum';

export interface AuthenticatedUser {
  userId: string;
  companyId: string;
  email: string;
  role: Role;
}
