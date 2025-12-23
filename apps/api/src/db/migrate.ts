import * as fs from 'fs';
import * as path from 'path';
import sqlite3 from 'sqlite3';

const DB_PATH = process.env.DATABASE_PATH || './data/indexer.db';
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

function getDb(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

async function runMigrations() {
  try {
    const db = await getDb();
    
    const migrations = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const migration of migrations) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, migration), 'utf-8');
      await new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
          if (err) {
            console.error(`Error in ${migration}:`, err);
            reject(err);
          } else {
            console.log(`✓ Executed: ${migration}`);
            resolve(null);
          }
        });
      });
    }

    db.close();
    console.log('✓ All migrations completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
