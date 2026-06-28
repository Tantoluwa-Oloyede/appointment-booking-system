import request from 'supertest';
import app from '../../src/app.js';
import db from '../../src/config/db/index.js';

jest.mock('../../src/api/services/email.js', () => jest.fn(() => Promise.resolve(true)));

describe('Auth Integration Tests', () => {
  beforeEach(async () => {
    // Clean database before each test
    await db.none('TRUNCATE users, service_providers, services, bookings CASCADE');
  });

  afterAll(async () => {
    // Close database connection pool
    await db.$config.pgp.end();
  });

  it('should register a customer, verify email, and login successfully', async () => {
    // Register
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        full_name: 'Integration Test User',
        email: 'integration@example.com',
        phone: '+2349012345678',
        password: 'Password123!',
        role: 'customer'
      });


    expect(registerRes.status).toBe(201);
    expect(registerRes.body.status).toBe('success');
    expect(registerRes.body.data.email).toBe('integration@example.com');

    // Fetch the verification code directly from the DB since we mocked the email sending
    const userInDb = await db.one('SELECT * FROM users WHERE email = $1', ['integration@example.com']);
    expect(userInDb.is_verified).toBe(false);
    expect(userInDb.verification_token).toBeDefined();

    // Verify Email
    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({
        email: 'integration@example.com',
        verification_code: userInDb.verification_token
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.status).toBe('success');

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'integration@example.com',
        password: 'Password123!'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.status).toBe('success');
    expect(loginRes.body.data.token).toBeDefined();
    expect(loginRes.body.data.user.email).toBe('integration@example.com');
  });

  it('should fail registration with invalid input', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'bad-email',
        password: '123'
      });

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('error');
    expect(res.body.errors).toBeDefined();
  });
});
