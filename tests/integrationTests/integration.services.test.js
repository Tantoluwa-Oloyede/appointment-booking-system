import request from 'supertest';
import app from '../../src/app.js';
import db from '../../src/config/db/index.js';
import * as Helpers from '../../src/lib/utils/utils.helpers.js';
import * as Hash from '../../src/lib/utils/utils.hash.js';


describe('Services Integration Tests', () => {
  let providerToken, providerUser, providerProfile;

  beforeEach(async () => {
    await db.none('TRUNCATE users, service_providers, services, bookings CASCADE');

    // Create a verified provider user in the DB
    const hashedPassword = await Hash.hashData('Password123!');
    providerUser = await db.one(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      ['Test Provider', 'provider@example.com', '09098765432', hashedPassword, 'provider', true]
    );

    // Create business profile
    providerProfile = await db.one(
      `INSERT INTO service_providers (user_id, business_name, bio, address)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [providerUser.id, 'Test Salon', 'Great haircuts', '123 Salon St']
    );

    // Generate JWT token
    providerToken = Helpers.generateJWTToken(providerUser);
  });

  afterAll(async () => {
    await db.$config.pgp.end();
  });

  it('should allow a provider to create and fetch services', async () => {
    // 1. Create a service
    const createRes = await request(app)
      .post('/api/v1/services/createService')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        name: 'Swedish Massage',
        description: 'Relaxing full body massage',
        category: 'Massage',
        duration_minutes: 60,
        price: 80.00
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('success');
    expect(createRes.body.data.name).toBe('Swedish Massage');

    const serviceId = createRes.body.data.id;

    // 2. Fetch services for this provider
    const fetchRes = await request(app)
      .get(`/api/v1/services?provider_id=${providerProfile.id}`)
      .set('Authorization', `Bearer ${providerToken}`);

    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.status).toBe('success');
    expect(fetchRes.body.data.length).toBeGreaterThan(0);
    expect(fetchRes.body.data[0].id).toBe(serviceId);
  });

  it('should block non-providers from creating services', async () => {
    // Create a customer user
    const customerUser = await db.one(
      `INSERT INTO users (full_name, email, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ['Test Customer', 'customer@example.com', 'hashed', 'customer', true]
    );
    const customerToken = Helpers.generateJWTToken(customerUser);

    const res = await request(app)
      .post('/api/v1/services/createService')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Swedish Massage',
        duration_minutes: 60,
        price: 80.00
      });

    expect(res.status).toBe(403);
  });
});
