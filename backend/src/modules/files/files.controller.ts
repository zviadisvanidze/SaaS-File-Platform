import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { FileVisibility } from '../../common/enums/file-visibility.enum';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { LogsService } from '../logs/logs.service';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function parseAllowedUserIds(raw?: string): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.filesService.listVisibleToUser(user);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('A file is required');
    }

    const visibility = dto.visibility ?? FileVisibility.ALL;
    const allowedUserIds = parseAllowedUserIds(dto.allowedUserIds);

    const created = await this.filesService.uploadFile({
      companyId: user.companyId,
      uploadedBy: user.userId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
      size: file.size,
      visibility,
      allowedUserIds,
    });

    await this.logsService.record(
      user.companyId,
      user.userId,
      'file.uploaded',
      {
        fileId: created.id,
        originalName: created.originalName,
        visibility: created.visibility,
      },
    );

    return created;
  }

  @Patch(':id/visibility')
  async updateVisibility(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateVisibilityDto,
  ) {
    const updated = await this.filesService.updateVisibility(
      id,
      user,
      dto.visibility,
      dto.allowedUserIds ?? [],
    );
    await this.logsService.record(
      user.companyId,
      user.userId,
      'file.visibility_updated',
      {
        fileId: id,
        visibility: dto.visibility,
      },
    );
    return updated;
  }

  @Get(':id/download-url')
  async getDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const url = await this.filesService.getDownloadUrl(id, user);
    return { url };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.filesService.deleteFile(id, user);
    await this.logsService.record(user.companyId, user.userId, 'file.deleted', {
      fileId: id,
    });
    return { success: true };
  }
}
