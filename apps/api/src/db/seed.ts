import sqlite3 from 'sqlite3';

const DB_PATH = process.env.DATABASE_PATH || './data/indexer.db';

function getDb(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

async function seedDatabase() {
  try {
    const db = await getDb();
    
    // Seed initial data if needed
    console.log('Database seeding completed');
    
    db.close();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
