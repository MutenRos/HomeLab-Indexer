import express, { Request, Response } from 'express';
import { PaginatedResponse, ServiceDTO } from '@homelab-indexer/shared';
import * as db from '../db/database';

const router = express.Router();

// GET /services?kind=http&page=1&per_page=20
router.get('/', async (req: Request, res: Response) => {
  try {
    const kind = req.query.kind as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const per_page = Math.min(100, parseInt(req.query.per_page as string) || 20);
    const offset = (page - 1) * per_page;

    let allServices = await db.getAllServices(kind);
    const total = allServices.length;
    const data = allServices.slice(offset, offset + per_page);

    const response: PaginatedResponse<ServiceDTO> = {
      data,
      total,
      page,
      per_page,
      has_more: offset + per_page < total,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// GET /services/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await db.getService(id);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

export default router;
