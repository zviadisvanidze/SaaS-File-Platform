import { IsString, MinLength } from 'class-validator';

export class ActivateEmployeeDto {
  @IsString()
  @MinLength(8)
  password: string;
}
