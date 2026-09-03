import pgp from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

const initOptions = {
    noWarnings: true,
};

const pg = pgp(initOptions); 

const targetConnectionString = process.env.NODE_ENV === 'test'
  ? process.env.DATABASE_URL_TEST
  : process.env.DATABASE_URL;

const cn = {
  connectionString: targetConnectionString,
  max: 100
};

const db = pg(cn);

export default db;