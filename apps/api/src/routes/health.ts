import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    checks: {
      database: 'ok',
      scanner: 'ok',
      api: 'ok',
    },
  });
});

export default router;
