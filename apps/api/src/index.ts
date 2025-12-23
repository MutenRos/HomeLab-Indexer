import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pino from 'pino';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Import routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import devicesRoutes from './routes/devices';
import servicesRoutes from './routes/services';
import reservationsRoutes from './routes/reservations';
import alertsRoutes from './routes/alerts';
import scannerRoutes from './routes/scanner';
import { getDatabase } from './db/database';

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/devices', devicesRoutes);
app.use('/services', servicesRoutes);
app.use('/reservations', reservationsRoutes);
app.use('/alerts', alertsRoutes);
app.use('/scanner', scannerRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function start() {
  try {
    // Ensure database exists and run migrations
    const db = await getDatabase();
    logger.info('✅ Database connected');

    // Run migrations
    const migrationsDir = path.join(__dirname, '../../../infra/migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrations = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const migration of migrations) {
        const sql = fs.readFileSync(path.join(migrationsDir, migration), 'utf-8');
        await new Promise((resolve, reject) => {
          db.exec(sql, (err) => {
            if (err) {
              logger.error(`Error in ${migration}:`, err);
              reject(err);
            } else {
              logger.info(`✓ Executed: ${migration}`);
              resolve(null);
            }
          });
        });
      }
    }

    // Start server
    const PORT = parseInt(process.env.API_PORT || '3001', 10);
    const HOST = process.env.API_HOST || '0.0.0.0';

    app.listen(PORT, HOST, () => {
      logger.info(`🚀 API running on http://${HOST}:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
