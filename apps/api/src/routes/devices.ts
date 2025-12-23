import express, { Request, Response } from 'express';
import { PaginatedResponse, DeviceDTO } from '@homelab-indexer/shared';
import * as db from '../db/database';

const router = express.Router();

// GET /devices?page=1&per_page=20
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const per_page = Math.min(100, parseInt(req.query.per_page as string) || 20);
    const offset = (page - 1) * per_page;

    const total = await db.countDevices();
    const data = await db.getAllDevices(per_page, offset);

    const response: PaginatedResponse<DeviceDTO> = {
      data,
      total,
      page,
      per_page,
      has_more: offset + per_page < total,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// GET /devices/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const device = await db.getDevice(id);

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Fetch related data
    const leases = await db.getLeasesByDevice(id);
    const services = await db.getServicesByDevice(id);
    const events = await db.getAllEvents(100, 0);
    const deviceEvents = events.filter(e => e.device_id === id);

    res.json({
      ...device,
      leases,
      services,
      events: deviceEvents,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

export default router;
