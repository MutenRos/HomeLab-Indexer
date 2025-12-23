import express, { Request, Response } from 'express';
import { PaginatedResponse, ReservationDTO } from '@homelab-indexer/shared';
import * as db from '../db/database';
import pino from 'pino';

const router = express.Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// GET /reservations?page=1&per_page=20
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const per_page = Math.min(100, parseInt(req.query.per_page as string) || 20);
    const offset = (page - 1) * per_page;

    const allReservations = await db.getAllReservations();
    const total = allReservations.length;
    const data = allReservations.slice(offset, offset + per_page);

    // Check for conflicts
    const conflicts: any[] = [];
    for (const res of data) {
      const device = await db.getDevice(`mac:${res.mac}`);
      if (device && device.hostname !== res.hostname) {
        conflicts.push({
          ip: res.ip,
          mac: res.mac,
          expected_hostname: res.hostname,
          actual_hostname: device.hostname,
        });
      }
    }

    const response: PaginatedResponse<ReservationDTO> = {
      data,
      total,
      page,
      per_page,
      has_more: offset + per_page < total,
    };

    res.json({ ...response, conflicts });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// POST /reservations
router.post('/', async (req: Request, res: Response) => {
  try {
    const { ip, mac, hostname, notes } = req.body;

    if (!ip || !mac) {
      return res.status(400).json({ error: 'Missing ip or mac' });
    }

    const reservation = await db.createReservation({ ip, mac, hostname, notes });
    res.status(201).json(reservation);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// DELETE /reservations/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.deleteReservation(id);
    res.status(204).send();
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
});

// POST /reservations/import
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { data } = req.body; // Expected: Array of { ip, mac, hostname?, notes? }

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Expected array of reservations' });
    }

    const imported = [];
    for (const item of data) {
      if (item.ip && item.mac) {
        const reservation = await db.createReservation({
          ip: item.ip,
          mac: item.mac,
          hostname: item.hostname,
          notes: item.notes,
        });
        imported.push(reservation);
      }
    }

    res.status(201).json({ count: imported.length, reservations: imported });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to import reservations' });
  }
});

// GET /reservations/export
router.get('/export', async (req: Request, res: Response) => {
  try {
    const format = req.query.format as string || 'json';
    const reservations = await db.getAllReservations();

    if (format === 'csv') {
      const csv = [
        'IP,MAC,Hostname,Notes',
        ...reservations.map(r => `${r.ip},${r.mac},"${r.hostname || ''}","${r.notes || ''}"`)
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=reservations.csv');
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=reservations.json');
      res.json(reservations);
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to export reservations' });
  }
});

export default router;
