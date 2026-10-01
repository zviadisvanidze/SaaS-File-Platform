import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileAsset, FileAssetSchema } from './file.schema';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { S3Service } from './s3.service';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileAsset.name, schema: FileAssetSchema },
    ]),
    CompaniesModule,
    UsersModule,
    LogsModule,
  ],
  controllers: [FilesController],
  providers: [FilesService, S3Service],
  exports: [FilesService, MongooseModule],
})
export class FilesModule {}
