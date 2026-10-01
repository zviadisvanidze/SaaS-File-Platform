import { IsEmail, IsEnum, IsString, Matches, MinLength } from 'class-validator';
import { Industry } from '../../../common/enums/industry.enum';

export class RegisterCompanyDto {
  @IsString()
  @MinLength(2)
  companyName: string;

  @Matches(/^\d{8,15}$/, {
    message: 'registrationNumber must be 8 to 15 digits',
  })
  registrationNumber: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  country: string;

  @IsEnum(Industry)
  industry: Industry;
}
