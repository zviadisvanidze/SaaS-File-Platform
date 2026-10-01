export interface AppConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  mongodbUri: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  aws: {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
  };
}

export default (): { app: AppConfig } => ({
  app: {
    port: parseInt(process.env.PORT ?? '3001', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    mongodbUri:
      process.env.MONGODB_URI ?? 'mongodb://localhost:27017/saas_platform',
    jwt: {
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    },
    aws: {
      region: process.env.AWS_REGION ?? 'eu-central-1',
      bucket: process.env.AWS_S3_BUCKET ?? '',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    },
    smtp: {
      host: process.env.SMTP_HOST ?? '',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
      from:
        process.env.MAIL_FROM ?? 'SaaS Platform <no-reply@saas-platform.local>',
    },
  },
});
