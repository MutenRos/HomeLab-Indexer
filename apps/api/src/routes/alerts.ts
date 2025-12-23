import express, { Request, Response } from 'express';
import { PaginatedResponse, EventDTO } from '@homelab-indexer/shared';
import * as db from '../db/database';

const router = express.Router();

// GET /alerts?type=new_device&page=1&per_page=20
router.get('/', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const per_page = Math.min(100, parseInt(req.query.per_page as string) || 20);
    const offset = (page - 1) * per_page;

    const allEvents = await db.getAllEvents(10000, 0, type);
    const total = allEvents.length;
    const data = allEvents.slice(offset, offset + per_page);

    const response: PaginatedResponse<EventDTO> = {
      data,
      total,
      page,
      per_page,
      has_more: offset + per_page < total,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /alerts/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await db.getEvent(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// PATCH /alerts/:id/ack
router.patch('/:id/ack', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.acknowledgeEvent(id);
    const event = await db.getEvent(id);
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to acknowledge event' });
  }
});

export default router;
