import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Industry } from '../../../common/enums/industry.enum';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  country?: string;

  @IsOptional()
  @IsEnum(Industry)
  industry?: Industry;
}
