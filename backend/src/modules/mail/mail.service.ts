import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('app.smtp.host');
    this.from = this.configService.get<string>('app.smtp.from') ?? '';

    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: this.configService.get<number>('app.smtp.port'),
          secure: this.configService.get<boolean>('app.smtp.secure'),
          auth: {
            user: this.configService.get<string>('app.smtp.user'),
            pass: this.configService.get<string>('app.smtp.pass'),
          },
        })
      : null;
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP not configured. Would send "${options.subject}" to ${options.to}:\n${options.html}`,
      );
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }

  async sendCompanyActivationEmail(
    to: string,
    activationUrl: string,
  ): Promise<void> {
    await this.sendMail({
      to,
      subject: 'Activate your company account',
      html: `<p>Welcome to the platform! Click the link below to activate your company account:</p>
             <p><a href="${activationUrl}">${activationUrl}</a></p>`,
    });
  }

  async sendEmployeeInviteEmail(
    to: string,
    activationUrl: string,
    companyName: string,
  ): Promise<void> {
    await this.sendMail({
      to,
      subject: `You have been invited to join ${companyName}`,
      html: `<p>You have been added as an employee of <strong>${companyName}</strong>.</p>
             <p>Click the link below to set your password and activate your account:</p>
             <p><a href="${activationUrl}">${activationUrl}</a></p>`,
    });
  }
}
