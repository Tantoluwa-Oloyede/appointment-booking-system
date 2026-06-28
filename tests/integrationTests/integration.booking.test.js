import request from 'supertest';
import app from '../../src/app.js';
import db from '../../src/config/db/index.js';
import * as Helpers from '../../src/lib/utils/utils.helpers.js';
import * as Hash from '../../src/lib/utils/utils.hash.js';

jest.mock('../../src/api/services/email.js', () => jest.fn(() => Promise.resolve(true))); 

describe('Booking Integration Tests', () => {
  let customerToken, customerUser;
  let providerToken, providerUser, providerProfile;
  let service;

  beforeEach(async () => {
    await db.none('TRUNCATE users, service_providers, services, bookings, availability_rules CASCADE');

    const hashedPassword = await Hash.hashData('Password123!');
    
    // Create customer
    customerUser = await db.one(
      `INSERT INTO users (full_name, email, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ['Test Customer', 'customer@example.com', hashedPassword, 'customer', true]
    );
    customerToken = Helpers.generateJWTToken(customerUser);

    // Create provider
    providerUser = await db.one(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      ['Test Provider', 'provider@example.com', '09098765432', hashedPassword, 'provider', true]
    );
    providerToken = Helpers.generateJWTToken(providerUser);

    providerProfile = await db.one(
      `INSERT INTO service_providers (user_id, business_name, bio, address)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [providerUser.id, 'Test Salon', 'Great haircuts', '123 Salon St']
    );

    // Create service
    service = await db.one(
      `INSERT INTO services (provider_id, name, duration_minutes, price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [providerProfile.id, 'Massage', 60, 50.00]
    );

    // Set Monday open availability: 09:00 - 17:00
    await db.none(
      `INSERT INTO availability_rules (provider_id, day_of_week, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [providerProfile.id, 1, '09:00:00', '17:00:00', 'open']
    );
  });

  afterAll(async () => {
    await db.$config.pgp.end();
  });

  it('should create and transition booking state successfully', async () => {
    // Get next Monday at 10 AM UTC
    const date = new Date();
    date.setDate(date.getDate() + ((1 + 7 - date.getDay()) % 7 || 7)); // Next Monday
    date.setUTCHours(10, 0, 0, 0); // 10 AM UTC
    const bookingStart = date.toISOString();

    // 1. Create booking (Customer)
    const createRes = await request(app)
      .post('/api/v1/bookings/createBooking')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: providerProfile.id,
        service_id: service.id,
        start_at: bookingStart,
        notes: 'Please be gentle'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('success');
    expect(createRes.body.data.status).toBe('pending');
    
    const bookingId = createRes.body.data.id;

    // 2. Confirm booking (Provider)
    const confirmRes = await request(app)
      .patch(`/api/v1/bookings/confirmBooking/${bookingId}`)
      .set('Authorization', `Bearer ${providerToken}`);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.status).toBe('success');
    expect(confirmRes.body.data.status).toBe('confirmed');

    // 3. Complete booking (Provider)
    const completeRes = await request(app)
      .patch(`/api/v1/bookings/completeBooking/${bookingId}`)
      .set('Authorization', `Bearer ${providerToken}`);

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.status).toBe('success');
    expect(completeRes.body.data.status).toBe('completed');
  });

  it('should prevent double bookings of the same provider slot', async () => {
    const date = new Date();
    date.setDate(date.getDate() + ((1 + 7 - date.getDay()) % 7 || 7));
    date.setUTCHours(10, 0, 0, 0);
    const bookingStart = date.toISOString();

    // Create first booking
    await request(app)
      .post('/api/v1/bookings/createBooking')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: providerProfile.id,
        service_id: service.id,
        start_at: bookingStart
      });

    // Try to book the same slot again
    const res = await request(app)
      .post('/api/v1/bookings/createBooking')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: providerProfile.id,
        service_id: service.id,
        start_at: bookingStart
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('This slot has just been taken. Please choose another time.');
  });
});
