import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pgp from 'pg-promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const connectionString = 'postgres://postgres:Best4deman@localhost:5432/bookingSystem_test';
  const initOptions = { noWarnings: true };
  const pg = pgp(initOptions);
  const db = pg(connectionString);

  try {
    const sqlPath = path.join(__dirname, '..', 'migrations', 'sqls', '20260424114231-booking-system-up.sql');
    console.log('Reading migration file:', sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Applying migrations to bookingSystem_test...');
    await db.none(sql);
    console.log('Migrations applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    pg.end();
  }
}

main();
