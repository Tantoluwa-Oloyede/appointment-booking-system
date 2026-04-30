import pgp from 'pg-promise';

const pg = pgp({ noWarnings: true }); // just suppresses startup warnings

const cn = {
  connectionString: process.env.DATABASE_URL,
  max:100
};

const db = pg(cn);

export default db;