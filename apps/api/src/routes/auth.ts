import express, { Request, Response } from 'express';
import { AuthRequest, AuthResponse } from '@homelab-indexer/shared';

const router = express.Router();

// POST /auth/login
router.post('/login', (req: Request<{}, {}, AuthRequest>, res: Response<AuthResponse>) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' } as any);
  }

  // TODO: Validate against stored credentials
  const token = 'placeholder-jwt-token';
  
  res.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 86400,
  });
});

export default router;
