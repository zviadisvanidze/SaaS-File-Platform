import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsMongoId,
  ValidateIf,
} from 'class-validator';
import { FileVisibility } from '../../../common/enums/file-visibility.enum';

export class UpdateVisibilityDto {
  @IsEnum(FileVisibility)
  visibility: FileVisibility;

  @ValidateIf(
    (dto: UpdateVisibilityDto) => dto.visibility === FileVisibility.RESTRICTED,
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  allowedUserIds?: string[];
}
