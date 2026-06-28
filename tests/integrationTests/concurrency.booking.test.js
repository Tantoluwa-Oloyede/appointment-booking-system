import request from 'supertest';
import app from '../../src/app.js';
import db from '../../src/config/db/index.js';
import * as Helpers from '../../src/lib/utils/utils.helpers.js';
import * as Hash from '../../src/lib/utils/utils.hash.js';

jest.mock('../../src/api/services/email.js', () => jest.fn(() => Promise.resolve(true)));

describe('Concurrency Booking Integration Test Suite', () => {
  let customerTokens = [];
  let providerProfile;
  let service;

  // ENVIRONMENT SETUP
  beforeEach(async () => {
    // Clear out previous data so concurrent records don't clash
    await db.none('TRUNCATE users, service_providers, services, bookings, availability_rules CASCADE');

    // Pre-hash password 
    const hashedPassword = await Hash.hashData('Password123!');
    
    // Seed 3 separate clients who will fight for the exact same slot
    customerTokens = [];
    for (let i = 1; i <= 3; i++) {
      const customer = await db.one(
        `INSERT INTO users (full_name, email, password_hash, role, is_verified)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [`Customer ${i}`, `customer${i}@gmail.com`, hashedPassword, 'customer', true]
      );
      // Generate real authorization headers for each customer
      customerTokens.push(Helpers.generateJWTToken(customer));
    }

    //Seed a real service provider account
    const providerUser = await db.one(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      ['Test Provider', 'provider@gmail.com', '09098765432', hashedPassword, 'provider', true]
    );

    providerProfile = await db.one(
      `INSERT INTO service_providers (user_id, business_name, bio, address)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [providerUser.id, 'Test Salon', 'Great haircuts', '123 Salon St']
    );

    //60-minute service linked to this provider
    service = await db.one(
      `INSERT INTO services (provider_id, name, duration_minutes, price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [providerProfile.id, 'Massage', 60, 5000.00]
    );

    //Set open business hours for Monday (Day 1)
    await db.none(
      `INSERT INTO availability_rules (provider_id, day_of_week, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [providerProfile.id, 1, '09:00:00', '17:00:00', 'open']
    );
  });

  // close connection pool so Jest exits cleanly
  afterAll(async () => {
    await db.$config.pgp.end();
  });

  
  it('should process 3 concurrent booking requests, giving 1 success (201) and 2 conflicts (409)', async () => {
    
    // Calculate the exact timestamp for Next Monday at 10:00 AM UTC
    const date = new Date();
    date.setDate(date.getDate() + ((1 + 7 - date.getDay()) % 7 || 7)); 
    date.setUTCHours(10, 0, 0, 0); 
    const bookingStart = date.toISOString();

    // Prepare 3 real HTTP requests using Supertest (pointing to the same slot)
    const requests = customerTokens.map((token, index) => {
      return request(app) // supertest (Tool used to fake HTTP network requests)
        .post('/api/v1/bookings/createBooking')
        .set('Authorization', `Bearer ${token}`)
        .send({
          provider_id: providerProfile.id,
          service_id: service.id,
          start_at: bookingStart,
          notes: `Race condition request from client ${index + 1}`
        });
    });

    // Sends all three requests at the exact same millisecond to the server
    const responses = await Promise.all(requests);


    // Group up the responses based on their HTTP response codes
    const successResponses = responses.filter(r => r.status === 201);
    const conflictResponses = responses.filter(r => r.status === 409);

    // Exactly one client wins, the other two get blocked
    expect(successResponses.length).toBe(1); 
    expect(conflictResponses.length).toBe(2); 

    //  Ensure blocked users get a clean message
    conflictResponses.forEach(response => {
      expect(response.body.message).toBe('This slot has just been taken. Please choose another time.');
    });

    // Ensure Postgres actually saved exactly 1 row
    const oneHourLater = new Date(date.getTime() + 60 * 60 * 1000).toISOString();
    const bookingsInDb = await db.any(
      `SELECT * FROM bookings 
       WHERE provider_id = $1 
       AND booking_period && tstzrange($2, $3)`, 
      [providerProfile.id, bookingStart, oneHourLater]
    );

    expect(bookingsInDb.length).toBe(1);
  });
});