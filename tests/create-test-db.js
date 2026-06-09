import pgp from 'pg-promise';

async function main() {
  const initOptions = { noWarnings: true };
  const pg = pgp(initOptions);
  const db = pg('postgres://postgres:Best4deman@localhost:5432/postgres');
  try {
    await db.none('CREATE DATABASE "bookingSystem_test"');
    console.log('Database bookingSystem_test created successfully.');
  } catch (error) {
    if (error.code === '42P04') {
      console.log('Database bookingSystem_test already exists.');
    } else {
      console.error('Error creating database:', error);
    }
  } finally {
    pg.end();
  }
}

main();
