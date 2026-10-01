import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { FileVisibility } from '../../common/enums/file-visibility.enum';

export type FileAssetDocument = HydratedDocument<FileAsset>;

@Schema({ timestamps: true })
export class FileAsset {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  })
  companyId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  s3Key: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({
    type: String,
    enum: FileVisibility,
    default: FileVisibility.ALL,
  })
  visibility: FileVisibility;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'User', default: [] })
  allowedUsers: Types.ObjectId[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const FileAssetSchema = SchemaFactory.createForClass(FileAsset);
