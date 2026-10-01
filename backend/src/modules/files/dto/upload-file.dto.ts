import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FileVisibility } from '../../../common/enums/file-visibility.enum';

export class UploadFileDto {
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @IsOptional()
  @IsString()
  allowedUserIds?: string;
}
