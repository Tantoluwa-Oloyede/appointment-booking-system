import request from 'supertest';
import app from '../../src/app.js';
import db from '../../src/config/db/index.js';
import * as Helpers from '../../src/lib/utils/utils.helpers.js';
import * as Hash from '../../src/lib/utils/utils.hash.js';

describe('Admin Integration Tests', () => {
  let adminToken, adminUser;
  let customerUser;

  beforeEach(async () => {
    await db.none('TRUNCATE users, system_audit_logs CASCADE');

    const hashedPassword = await Hash.hashData('Password123!');
    
    // Create admin
    adminUser = await db.one(
      `INSERT INTO users (full_name, email, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ['Test Admin', 'admin@example.com', hashedPassword, 'admin', true]
    );
    adminToken = Helpers.generateJWTToken(adminUser);

    // Create customer
    customerUser = await db.one(
      `INSERT INTO users (full_name, email, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ['Test Customer', 'customer@example.com', hashedPassword, 'customer', true]
    );
  });

  afterAll(async () => {
    await db.$config.pgp.end();
  });

  it('should fetch system stats and allow user suspension', async () => {
    // Get stats
    const statsRes = await request(app)
      .get('/api/v1/admin/getStats')
      .set('Authorization', `Bearer ${adminToken}`);


    expect(statsRes.status).toBe(200);
    expect(statsRes.body.status).toBe('success');
    
    expect(statsRes.body.data).toBeDefined(); 

    // Get all users
    const usersRes = await request(app)
      .get('/api/v1/admin/allUsers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(usersRes.status).toBe(200);
    expect(usersRes.body.status).toBe('success');
    expect(usersRes.body.data.length).toBeGreaterThan(1); 

    // Suspend customer
    const suspendRes = await request(app)
      .patch(`/api/v1/admin/users/${customerUser.id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.status).toBe('success');
    expect(suspendRes.body.data.is_active).toBe(false);

    // Verify suspended user cannot login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'customer@example.com',
        password: 'Password123!'
      });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.message).toBe('Your account has been suspended. Please contact support.');
  });
});