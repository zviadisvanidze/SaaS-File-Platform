import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const DOWNLOAD_URL_TTL_SECONDS = 300;

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('app.aws.bucket') ?? '';
    this.client = new S3Client({
      region: this.configService.get<string>('app.aws.region'),
      credentials: {
        accessKeyId:
          this.configService.get<string>('app.aws.accessKeyId') ?? '',
        secretAccessKey:
          this.configService.get<string>('app.aws.secretAccessKey') ?? '',
      },
    });
  }

  buildObjectKey(companyId: string, originalName: string): string {
    return `companies/${companyId}/${randomUUID()}-${originalName}`;
  }

  async uploadObject(
    key: string,
    body: Buffer,
    mimeType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, {
      expiresIn: DOWNLOAD_URL_TTL_SECONDS,
    });
  }
}
