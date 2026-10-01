import { Industry } from '../../common/enums/industry.enum';

export interface CreateCompanyInput {
  name: string;
  registrationNumber: string;
  country: string;
  industry: Industry;
}
