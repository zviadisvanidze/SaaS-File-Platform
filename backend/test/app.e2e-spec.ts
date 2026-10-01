import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { User, UserDocument } from '../src/modules/users/user.schema';
import { Role } from '../src/common/enums/role.enum';
import { Industry } from '../src/common/enums/industry.enum';
import { S3Service } from '../src/modules/files/s3.service';

class FakeS3Service {
  buildObjectKey(companyId: string, originalName: string): string {
    return `companies/${companyId}/fake-${originalName}`;
  }
  async uploadObject(): Promise<void> {}
  async deleteObject(): Promise<void> {}
  async getDownloadUrl(key: string): Promise<string> {
    return `https://fake-bucket.local/${key}`;
  }
}

describe('SaaS platform (e2e)', () => {
  let mongoServer: MongoMemoryServer;
  let app: INestApplication;
  let userModel: Model<UserDocument>;

  const companyPayload = {
    companyName: 'Acme Analytics',
    registrationNumber: '12345678910',
    email: 'admin@acme.test',
    password: 'StrongPass123',
    country: 'Georgia',
    industry: Industry.FINANCE,
  };

  let adminToken: string;
  let employeeToken: string;
  let employeeId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.JWT_SECRET = 'test-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Service)
      .useClass(FakeS3Service)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api');
    await app.init();

    userModel = moduleFixture.get<Model<UserDocument>>(
      getModelToken(User.name),
    );
  }, 60000);

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  async function readActivationToken(email: string): Promise<string> {
    const user = await userModel.findOne({ email });
    if (!user?.activationToken) {
      throw new Error(`No activation token found for ${email}`);
    }
    return user.activationToken;
  }

  it('registers the company and sends an inactive admin account', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(companyPayload)
      .expect(201);

    expect(response.body.companyId).toBeDefined();

    const loginAttempt = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: companyPayload.email, password: companyPayload.password });

    expect(loginAttempt.status).toBe(401);
  });

  it('rejects registering a second company with the same registration number', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...companyPayload, email: 'another-admin@acme.test' })
      .expect(409);
  });

  it('activates the company through the emailed token and allows login', async () => {
    const token = await readActivationToken(companyPayload.email);
    await request(app.getHttpServer())
      .get(`/api/auth/activate/${token}`)
      .expect(200);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: companyPayload.email, password: companyPayload.password })
      .expect(201);

    expect(loginResponse.body.accessToken).toBeDefined();
    expect(loginResponse.body.user.role).toBe(Role.ADMIN);
    adminToken = loginResponse.body.accessToken;
  });

  it('exposes the company profile for the authenticated admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/company/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.name).toBe(companyPayload.companyName);
    expect(response.body.subscription.plan).toBe('free');
  });

  it('blocks adding an employee while on the free plan', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'employee@acme.test' })
      .expect(400);

    expect(response.body.message).toContain('Free');
  });

  it('upgrades to the basic plan', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/subscription')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plan: 'basic' })
      .expect(200);

    expect(response.body.subscription.plan).toBe('basic');
  });

  it('adds an employee, who activates and logs in but cannot manage the team', async () => {
    const addResponse = await request(app.getHttpServer())
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'employee@acme.test', firstName: 'Nina' })
      .expect(201);

    employeeId = addResponse.body._id;

    const activationToken = await readActivationToken('employee@acme.test');
    await request(app.getHttpServer())
      .post(`/api/auth/employee-activate/${activationToken}`)
      .send({ password: 'EmployeePass123' })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'employee@acme.test', password: 'EmployeePass123' })
      .expect(201);

    expect(loginResponse.body.user.role).toBe(Role.EMPLOYEE);
    employeeToken = loginResponse.body.accessToken;

    await request(app.getHttpServer())
      .get('/api/employees')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('computes billing based on employee count on the basic plan', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/billing/current')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.employeeCount).toBe(1);
    expect(response.body.amountDueUsd).toBe(5);
  });

  it('rejects uploading a file type other than csv/xls/xlsx', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('visibility', 'all')
      .attach('file', Buffer.from('not a spreadsheet'), 'notes.txt')
      .expect(400);

    expect(response.body.message).toContain('CSV');
  });

  it('uploads a company-wide file that both admin and employee can see and download', async () => {
    const uploadResponse = await request(app.getHttpServer())
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('visibility', 'all')
      .attach('file', Buffer.from('a,b,c\n1,2,3'), 'shared.csv')
      .expect(201);

    const fileId = uploadResponse.body._id;

    const employeeList = await request(app.getHttpServer())
      .get('/api/files')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
    expect(
      employeeList.body.some((f: { _id: string }) => f._id === fileId),
    ).toBe(true);

    const downloadResponse = await request(app.getHttpServer())
      .get(`/api/files/${fileId}/download-url`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
    expect(downloadResponse.body.url).toContain('shared.csv');
  });

  it('hides a restricted file from employees who are not on the allow-list and blocks their download', async () => {
    const secondEmployeeResponse = await request(app.getHttpServer())
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'other-employee@acme.test' })
      .expect(201);
    const secondEmployeeId = secondEmployeeResponse.body._id;

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('visibility', 'restricted')
      .field('allowedUserIds', secondEmployeeId)
      .attach('file', Buffer.from('a,b,c\n4,5,6'), 'secret.csv')
      .expect(201);

    const fileId = uploadResponse.body._id;

    const employeeList = await request(app.getHttpServer())
      .get('/api/files')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
    expect(
      employeeList.body.some((f: { _id: string }) => f._id === fileId),
    ).toBe(false);

    await request(app.getHttpServer())
      .get(`/api/files/${fileId}/download-url`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/employees/${secondEmployeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('lets the admin remove the employee', async () => {
    await request(app.getHttpServer())
      .delete(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toHaveLength(0);
  });

  it('records audit log entries for the actions taken above', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const actions = response.body.map((log: { action: string }) => log.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'company.registered',
        'company.activated',
        'subscription.plan_changed',
        'employee.added',
        'employee.activated',
        'employee.removed',
      ]),
    );
  });
});
