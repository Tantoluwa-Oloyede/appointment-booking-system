import request from 'supertest';
import app from '../../src/app.js';
import db from '../../src/config/db/index.js';
import * as Helpers from '../../src/lib/utils/utils.helpers.js';
import * as Hash from '../../src/lib/utils/utils.hash.js';

describe('Availability Integration Tests', () => {
  let providerToken, providerUser, providerProfile;

  beforeEach(async () => {
    await db.none('TRUNCATE users, service_providers, availability_rules, bookings CASCADE');

    const hashedPassword = await Hash.hashData('Password123!');
    providerUser = await db.one(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      ['Test Provider', 'provider@example.com', '09098765432', hashedPassword, 'provider', true]
    );

    providerProfile = await db.one(
      `INSERT INTO service_providers (user_id, business_name, bio, address)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [providerUser.id, 'Test Salon', 'Great haircuts', '123 Salon St']
    );

    providerToken = Helpers.generateJWTToken(providerUser);
  });

  afterAll(async () => {
    await db.$config.pgp.end();
  });

  it('should set and fetch availability rules successfully', async () => {
    // Set availability for Monday
    const setRes = await request(app)
      .post('/api/v1/availability/setAvailability')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        rules: [
          {
            day_of_week: 1, // Monday
            status: 'open',
            start_time: '09:00',
            end_time: '17:00',
            break_start: '12:00',
            break_end: '13:00'
          }
        ]
      });

    expect(setRes.status).toBe(201);
    expect(setRes.body.status).toBe('success');
    expect(setRes.body.data[0].day_of_week).toBe(1);

    // Get availability rules
    const getRes = await request(app)
      .get(`/api/v1/availability/getAvailability?provider_id=${providerProfile.id}`)
      .set('Authorization', `Bearer ${providerToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.status).toBe('success');
    expect(getRes.body.data.length).toBe(1);
    expect(getRes.body.data[0].status).toBe('open');
  });

  it('should fetch available slots for a date', async () => {
    // Create a service first
    const service = await db.one(
      `INSERT INTO services (provider_id, name, duration_minutes, price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [providerProfile.id, 'Massage', 60, 50.00]
    );

    // Set availability rules (Monday open 09:00 - 12:00)
    await db.none(
      `INSERT INTO availability_rules (provider_id, day_of_week, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [providerProfile.id, 1, '09:00:00', '12:00:00', 'open']
    );

    // Get a future Monday date
    const date = new Date();
    date.setDate(date.getDate() + ((1 + 7 - date.getDay()) % 7 || 7)); // Next Monday
    const dateStr = date.toISOString().split('T')[0];

    //  Query slots
    const slotsRes = await request(app)
    .get(`/api/v1/availability/getSlots?provider_id=${providerProfile.id}&service_id=${service.id}&date=${dateStr}`)
    .set('Authorization', `Bearer ${providerToken}`);

    expect(slotsRes.status).toBe(200);
    expect(slotsRes.body.status).toBe('success');
    // From 09:00 to 12:00, with 60 min duration, should be 3 slots: 09:00, 10:00, 11:00
    expect(slotsRes.body.data.length).toBe(3);
  });
});
