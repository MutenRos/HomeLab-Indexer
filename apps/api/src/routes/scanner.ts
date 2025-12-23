import express, { Request, Response } from 'express';
import { ScanResponse } from '@homelab-indexer/shared';
import { performScan } from '../scanner/scanner';
import pino from 'pino';

const router = express.Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// POST /scanner/scan-now
router.post('/scan-now', async (req: Request, res: Response) => {
  try {
    const { subnets, port_scan } = req.body;

    const scanSubnets = subnets || process.env.SCANNER_SUBNETS?.split(',') || ['192.168.1.0/24'];
    const scanId = `scan:${Date.now()}`;
    const timestamp = new Date().toISOString();

    res.status(202).json({
      scan_id: scanId,
      timestamp,
    });

    // Run scan asynchronously
    performScan(scanSubnets).catch(error => {
      logger.error('Scan failed:', error);
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to trigger scan' });
  }
});

export default router;
