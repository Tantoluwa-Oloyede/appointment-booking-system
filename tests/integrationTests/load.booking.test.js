// import request from 'supertest';
// import app from '../../src/app.js';
// import db from '../../src/config/db/index.js';
// import * as Helpers from '../../src/lib/utils/utils.helpers.js';
// import * as Hash from '../../src/lib/utils/utils.hash.js';

// describe('High Load Simulation Test', () => {
//   let customerToken, customerUser, providerProfile, service;

//   beforeAll(async () => {
//     // Clean up and seed minimal data needed for database endpoints
//     await db.none('TRUNCATE users, service_providers, services, bookings CASCADE');

//     const hashedPassword = await Hash.hashData('Password123!');
//     customerUser = await db.one(
//       `INSERT INTO users (full_name, email, password_hash, role, is_verified)
//        VALUES ($1, $2, $3, $4, $5) RETURNING *`,
//       ['Load Customer', 'load-customer@example.com', hashedPassword, 'customer', true]
//     );
//     customerToken = Helpers.generateJWTToken(customerUser);

//     const providerUser = await db.one(
//       `INSERT INTO users (full_name, email, phone, password_hash, role, is_verified)
//        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
//       ['Load Provider', 'load-provider@example.com', '09011111111', hashedPassword, 'provider', true]
//     );
    
//     providerProfile = await db.one(
//       `INSERT INTO service_providers (user_id, business_name, bio, address)
//        VALUES ($1, $2, $3, $4) RETURNING *`,
//       [providerUser.id, 'Load Salon', 'Load business', 'Load address']
//     );

//     service = await db.one(
//       `INSERT INTO services (provider_id, name, duration_minutes, price)
//        VALUES ($1, $2, $3, $4) RETURNING *`,
//       [providerProfile.id, 'Massage', 60, 50.00]
//     );

//     // Set Monday open availability
//     await db.none(
//       `INSERT INTO availability_rules (provider_id, day_of_week, start_time, end_time, status)
//        VALUES ($1, $2, $3, $4, $5)`,
//       [providerProfile.id, 1, '09:00:00', '17:00:00', 'open']
//     );
//   });

//   afterAll(async () => {
//     await db.$config.pgp.end();
//   });

//   // Set Jest timeout to 60 seconds to allow load testing to complete
//   jest.setTimeout(60000);

//   it('should handle 2000 concurrent HTTP requests to the non-blocking root endpoint gracefully', async () => {
//     const totalRequests = 2000;
//     console.log(`Simulating ${totalRequests} concurrent HTTP requests on non-blocking path...`);

//     const startTime = Date.now();

//     // Fire 2000 requests concurrently
//     const requests = Array.from({ length: totalRequests }).map(() => {
//       return request(app).get('/');
//     });

//     const responses = await Promise.all(requests);
//     const duration = Date.now() - startTime;

//     // Verify all responses returned 200 OK
//     const successCount = responses.filter(r => r.status === 200).length;
//     console.log(`Finished 2000 requests in ${duration}ms. Success count: ${successCount}`);

//     expect(successCount).toBe(totalRequests);
//     expect(duration).toBeLessThan(15000); // Should easily complete within 15 seconds
//   });

//   it('should handle 200 concurrent database-backed requests through the connection pool', async () => {
//     const totalRequests = 200;
//     console.log(`Simulating ${totalRequests} concurrent DB-backed requests on /api/availability/getAvailableSlots...`);

//     // Get a future Monday date
//     const date = new Date();
//     date.setDate(date.getDate() + ((1 + 7 - date.getDay()) % 7 || 7)); // Next Monday
//     const dateStr = date.toISOString().split('T')[0];

//     const startTime = Date.now();

//     // Fire 200 database-backed requests concurrently
//     const requests = Array.from({ length: totalRequests }).map(() => {
//       return request(app)
//         .get(`/api/v1/availability/getSlots?provider_id=${providerProfile.id}&service_id=${service.id}&date=${dateStr}`)
//         .set('Authorization', `Bearer ${customerToken}`);
//     });

//     const responses = await Promise.all(requests);
//     const duration = Date.now() - startTime;

//     if (responses.length > 0 && responses[0].status !== 200) {
//       console.log("DB TEST FAILURE STATUS:", responses[0].status);
//       console.log("DB TEST FAILURE BODY:", JSON.stringify(responses[0].body, null, 2));
//     }

//     const successCount = responses.filter(r => r.status === 200).length;
//     console.log(`Finished 200 DB-backed requests in ${duration}ms. Success count: ${successCount}`);

//     // Since the database pool size is 100, pg-promise queues the extra 100 requests.
//     // They should all resolve successfully without crashing the database server or dropping connections.
//     expect(successCount).toBe(totalRequests);
//   });
// });





import request from 'supertest';
import app from '../../src/app.js';
import db from '../../src/config/db/index.js';
import * as Helpers from '../../src/lib/utils/utils.helpers.js';
import * as Hash from '../../src/lib/utils/utils.hash.js';

describe('High Load Simulation Test', () => {
  let customerToken, customerUser, providerProfile, service;

  beforeAll(async () => {
    // Clean up and seed minimal data needed for database endpoints
    await db.none('TRUNCATE users, service_providers, services, bookings CASCADE');

    const hashedPassword = await Hash.hashData('Password123!');
    customerUser = await db.one(
      `INSERT INTO users (full_name, email, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ['Load Customer', 'load-customer@example.com', hashedPassword, 'customer', true]
    );
    customerToken = Helpers.generateJWTToken(customerUser);

    const providerUser = await db.one(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      ['Load Provider', 'load-provider@example.com', '09011111111', hashedPassword, 'provider', true]
    );
    
    providerProfile = await db.one(
      `INSERT INTO service_providers (user_id, business_name, bio, address)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [providerUser.id, 'Load Salon', 'Load business', 'Load address']
    );

    service = await db.one(
      `INSERT INTO services (provider_id, name, duration_minutes, price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [providerProfile.id, 'Massage', 60, 50.00]
    );

    // Set Monday open availability
    await db.none(
      `INSERT INTO availability_rules (provider_id, day_of_week, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [providerProfile.id, 1, '09:00:00', '17:00:00', 'open']
    );
  });

  afterAll(async () => {
    await db.$config.pgp.end();
  });

  // Set Jest timeout to 60 seconds to allow load testing to complete
  jest.setTimeout(60000);

  it('should handle 2000 concurrent HTTP requests to the non-blocking root endpoint gracefully', async () => {
    const totalRequests = 2000;
    console.log(`Simulating ${totalRequests} concurrent HTTP requests on non-blocking path...`);

    const startTime = Date.now();

    // Fire 2000 requests concurrently
    const requests = Array.from({ length: totalRequests }).map(() => {
      return request(app).get('/');
    });

    const responses = await Promise.all(requests);
    const duration = Date.now() - startTime;

    // Verify all responses returned 200 OK
    const successCount = responses.filter(r => r.status === 200).length;
    console.log(`Finished 2000 requests in ${duration}ms. Success count: ${successCount}`);

    expect(successCount).toBe(totalRequests);
    expect(duration).toBeLessThan(15000); // Should easily complete within 15 seconds
  });

  it('should handle 200 concurrent database-backed requests through the connection pool', async () => {
    const totalRequests = 200;
    console.log(`Simulating ${totalRequests} concurrent DB-backed requests on /api/v1/availability/getSlots...`);

    // Get a future Monday date safely
    const date = new Date();
    date.setDate(date.getDate() + ((1 + 7 - date.getDay()) % 7 || 7)); // Next Monday
    const dateStr = date.toISOString().split('T')[0];

    const startTime = Date.now();

    // Fire 200 database-backed requests concurrently
    const requests = Array.from({ length: totalRequests }).map(() => {
      return request(app)
        // 🔥 FIXED: End point path is now explicitly targeted to /getSlots
        .get(`/api/v1/availability/getSlots?provider_id=${providerProfile.id}&service_id=${service.id}&date=${dateStr}`)
        .set('Authorization', `Bearer ${customerToken}`);
    });

    const responses = await Promise.all(requests);
    const duration = Date.now() - startTime;

    // Direct structural safety logger
    if (responses.length > 0 && responses[0].status !== 200) {
      console.log("DB TEST FAILURE STATUS:", responses[0].status);
      console.log("DB TEST FAILURE BODY:", JSON.stringify(responses[0].body, null, 2));
    }

    const successCount = responses.filter(r => r.status === 200).length;
    console.log(`Finished 200 DB-backed requests in ${duration}ms. Success count: ${successCount}`);

    expect(successCount).toBe(totalRequests);
  });
});
